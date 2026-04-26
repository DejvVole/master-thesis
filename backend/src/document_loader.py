from pathlib import Path
from typing import List, Tuple
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import Document
from llama_index.readers.file import PDFReader, DocxReader

import logging
import subprocess
import tempfile
import shutil
import sys
import os
import zipfile

logger = logging.getLogger(__name__)


def _is_zip_based_document(file_path: str) -> bool:
    """Return True for ZIP-based Office files (e.g., .docx), even with wrong extension."""
    try:
        return zipfile.is_zipfile(file_path)
    except Exception:
        return False


def _find_libreoffice() -> str:
    """Return the LibreOffice executable path for the current platform."""
    if sys.platform == "win32":
        candidates = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        for path in candidates:
            if os.path.isfile(path):
                return path
        raise RuntimeError(
            "LibreOffice not found on Windows. "
            "Install it from https://www.libreoffice.org/ and ensure soffice.exe exists."
        )
    else:
        # Linux / macOS: prefer 'libreoffice', fall back to 'soffice'
        for cmd in ("libreoffice", "soffice"):
            if shutil.which(cmd):
                return cmd
        raise RuntimeError(
            "No .doc converter found. Install either:\n"
            "  - antiword (lightweight): `apt install antiword`\n"
            "  - LibreOffice (full):     `apt install libreoffice`"
        )


def _load_doc_with_antiword(file_path: str, original_filename: str) -> List[Document]:
    """
    Extract text from a .doc file using antiword (lightweight, Linux/macOS only).
    Returns a single Document with the extracted text.
    """
    result = subprocess.run(
        ["antiword", file_path],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"antiword failed for {file_path}: {result.stderr.strip()}")
    text = result.stdout
    if not text.strip():
        raise RuntimeError(f"antiword produced no text for {file_path}")
    doc = Document(
        text=text,
        metadata={
            "file_name": original_filename,
            "file_path": file_path,
        },
    )
    doc.text_template = "Metadata:\n{metadata_str}\n---\nContent:\n{content}"
    return [doc]


def convert_doc_to_docx(file_path: str) -> str:
    """
    Convert a legacy .doc file to .docx using LibreOffice headless mode.

    Works on both Linux/macOS and Windows.
    Returns the path to the converted .docx file inside a temporary directory.
    The caller is responsible for cleaning up the temporary directory.
    """
    executable = _find_libreoffice()
    tmp_dir = tempfile.mkdtemp()
    try:
        result = subprocess.run(
            [executable, "--headless", "--convert-to", "docx", "--outdir", tmp_dir, file_path],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"LibreOffice conversion failed for {file_path}: {result.stderr}"
            )
        stem = Path(file_path).stem
        converted = Path(tmp_dir) / f"{stem}.docx"
        if not converted.exists():
            raise RuntimeError(
                f"LibreOffice conversion produced no output for {file_path}"
            )
        logger.info(f"Converted .doc → .docx: {converted}")
        return str(converted), tmp_dir
    except Exception:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise

def merge_page_documents(docs: List[Document]) -> Document:
    """
    Merge multiple page documents into one single document.
    
    Simple concatenation without page markers - just joins all text.
    
    Args:
        docs: List of page documents (one per page)
        
    Returns:
        Single merged Document
    """
    if not docs:
        raise ValueError("Cannot merge empty document list")
    
    merged_text = "\n\n".join([doc.text for doc in docs])
    
    merged_doc = Document(
        text=merged_text,
        metadata={
            "file_name": docs[0].metadata.get('file_name'),
            "file_path": docs[0].metadata.get('file_path'),
            "page_count": len(docs),
            "merged_from_pages": True,
            "total_characters": len(merged_text)
        }
    )
    
    merged_doc.text_template = docs[0].text_template
    merged_doc.excluded_embed_metadata_keys = docs[0].excluded_embed_metadata_keys.copy()
    
    return merged_doc


def load_single_doc(
    file_path: str, 
    original_filename: str, 
    merge_pages: bool = True
) -> Tuple[str, List[Document]]:
    """Load document from specific file path."""

    if not Path(file_path).exists():
        raise ValueError(f"Document file not found: {file_path}")
    
    file_ext = Path(file_path).suffix.lower()
    tmp_dir = None

    try:
        if file_ext == '.doc':
            if _is_zip_based_document(file_path):
                logger.warning(
                    "File has .doc extension but ZIP/OOXML content was detected. "
                    "Loading as .docx parser."
                )
                file_ext = '.docx'
            elif sys.platform != "win32" and shutil.which("antiword"):
                try:
                    docs = _load_doc_with_antiword(file_path, original_filename)
                    logger.info(f"Loaded .doc via antiword: {original_filename}")
                    if merge_pages:
                        merged_doc = merge_page_documents(docs)
                        logger.info(f"✓ Merged {len(docs)} pages → 1 document")
                        return original_filename, [merged_doc]
                    return original_filename, docs
                except RuntimeError as exc:
                    logger.warning(
                        "antiword could not parse .doc, attempting LibreOffice conversion fallback: %s",
                        exc,
                    )
            if file_ext == '.doc':
                file_path, tmp_dir = convert_doc_to_docx(file_path)
                file_ext = '.docx'

        if file_ext == '.pdf':
            parser = PDFReader()
        elif file_ext == '.docx':
            parser = DocxReader()
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        docs = SimpleDirectoryReader(
            input_files=[file_path],
            file_extractor={file_ext: parser}
        ).load_data()
        
        if not docs:
            raise ValueError(f"Failed to load document from {file_path}")
        
        for doc in docs:
            doc.metadata['file_name'] = original_filename
            doc.text_template = "Metadata:\n{metadata_str}\n---\nContent:\n{content}"
            if "page_label" not in doc.excluded_embed_metadata_keys:
                doc.excluded_embed_metadata_keys.append("page_label")
        
        logger.info(f"Loaded {len(docs)} page documents from: {original_filename}")
        
        if merge_pages:
            merged_doc = merge_page_documents(docs)
            logger.info(f"✓ Merged {len(docs)} pages → 1 document")
            return original_filename, [merged_doc]
        else:
            return original_filename, docs
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)

def get_file_name(doc: Document) -> str:
    """Extract file name from document metadata."""
    return doc.metadata.get("file_name", "unknown")


def get_pdf_stem(doc: Document) -> str:
    """Extract file stem (name without extension) from document."""
    file_name = get_file_name(doc)
    return Path(file_name).stem