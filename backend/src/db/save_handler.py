from pathlib import Path
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

from llm_setup import get_embedding_model
from db.db_operations import create_processing_record, save_building_to_db, save_category_embeddings, save_normalized_values_to_db, save_source_document, save_source_metadata
from storage.minio_operations import MinIOOperations
from utils.config_loader import CONFIG

logger = logging.getLogger(__name__)

def save_rag_output_to_database(
    complete_output: Dict[str, Any],
    normalized_results: Dict[str, Dict[str, Any]],
    rok_vystavby_int: Optional[int],
    target_pdf: Optional[str] = None,
    minio_object_name: Optional[str] = None,
    building_name: Optional[str] = None,
    evaluation_results: Optional[Dict] = None,
    nodes: Optional[List] = None,
    source_metadata: Optional[Dict[str, Dict]] = None,
    inference_enabled: bool = False,
    extracted_count: int = 0,
    inferred_count: int = 0,
    missing_count: int = 0,
    file_hash: Optional[str] = None
) -> Optional[int]:
    """Uloží RAG output do databázy (PDF je už v MinIO)."""
    try:
        print("\n" + "=" * 70)
        print("SAVING TO DATABASE")
        print("=" * 70)

        if not building_name and target_pdf:
            building_name = Path(target_pdf).stem
        
        if target_pdf:
            building_folder_name = Path(target_pdf).stem
            print(f"Using folder name from PDF: {building_folder_name}")
        else:
            building_folder_name = complete_output.get('meno_budovy', 'unknown_building')
        
        doc_id = None
        processing_id = None
        
        if target_pdf and minio_object_name:
            print(f"\n✓ PDF already in MinIO: {minio_object_name}")
            if file_hash:
                print(f"   File hash: {file_hash[:16]}...")
            
            # 1. Source document
            doc_id = save_source_document(
                file_name=target_pdf,
                minio_object_name=minio_object_name,
                metadata={
                    "building_name": complete_output.get('meno_budovy', 'unknown'),
                    "building_folder": building_folder_name,
                    "inference_status": inference_enabled,
                    "extracted_count": extracted_count,
                    "inferred_count": inferred_count,
                    "missing_count": missing_count
                },
                file_hash=file_hash
            )
            
            # 2. Document processing
            processing_id = create_processing_record(
                source_document_id=doc_id,
                minio_object_name=minio_object_name,
                chroma_collection=CONFIG['storage']['collection_name']
            )
            
            if processing_id:
                logger.info(f"✓ Processing record created with ID: {processing_id}")
        
        # 3. Building info
        budova_id = save_building_to_db(
            output_data=complete_output,
            rok_vystavby_normalized=rok_vystavby_int,
            source_document_id=doc_id
        )

        # 4. Normalizované hodnoty (M:N tabuľka)
        normalized_count = save_normalized_values_to_db(
            building_id=budova_id,
            normalized_results=normalized_results
        )
        logger.info(f"✓ Saved {normalized_count} normalized values")
        
        if budova_id:
            # 5. Source metadata
            if source_metadata:
                print("\nSaving source metadata...")
                success = save_source_metadata(budova_id, source_metadata)
                if success:
                    print(f"✓ Source metadata saved successfully")
                else:
                    print(f"✗ Failed to save source metadata")
            
            # 6. Embeddings
            logger.info("\nGenerating category embeddings...")
            embed_model = get_embedding_model()
            success = save_category_embeddings(budova_id, complete_output, embed_model)
            
            if success:
                logger.info(f"✓ Category embeddings saved successfully")
            else:
                logger.error(f"✗ Failed to save category embeddings")

        logger.info("\n" + "=" * 70)
        logger.info("EXPORTING RAG RESULTS TO MINIO")
        logger.info("=" * 70)

        export_metadata = {
            "source_pdf": target_pdf,
            "building_id": budova_id,
            "document_id": doc_id,
            "processing_id": processing_id,
            "processing_date": datetime.now().isoformat(),
            "chunks_count": len(nodes) if nodes else 0,
            "source_metadata": source_metadata,
            "inference_enabled": inference_enabled,
            "extracted_count": extracted_count,
            "inferred_count": inferred_count,
            "missing_count": missing_count
        }

        minio_ops = MinIOOperations()
        
        # 7. Export do MinIO
        exported_files = minio_ops.export_rag_results(
            building_name=building_name,
            complete_output=complete_output,
            evaluation_results=evaluation_results,
            metadata=export_metadata
        )
        
        if exported_files:
            logger.info(f"\n✓ RAG results exported to folder: {building_folder_name}/")
            for file_type, object_name in exported_files.items():
                logger.info(f"  - {file_type.upper()}: {object_name}")
        else:
            logger.error("✗ Failed to export RAG results")
        
        logger.info("\n" + "=" * 70)
        logger.info("SAVE COMPLETED SUCCESSFULLY")
        logger.info("=" * 70)
        
        return budova_id
        
    except Exception as e:
        logger.error(f"Error saving to database: {e}")
        import traceback
        traceback.print_exc()
        
        return None