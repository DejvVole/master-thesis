from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter, SemanticSplitterNodeParser
from llama_index.core.extractors import TitleExtractor, QuestionsAnsweredExtractor
from utils.config_loader import CONFIG
import logging

logger = logging.getLogger(__name__)

def create_ingestion_pipeline(llm, embed_model):
    """
    Create an ingestion pipeline with transformations for text processing
    """
    
    buffer_size = CONFIG['chunking']['semantic_splitter']['buffer_size']
    breakpoint_percentile_threshold = CONFIG['chunking']['semantic_splitter']['percentile_threshold']

    semantic_splitter = SemanticSplitterNodeParser(
        buffer_size=buffer_size,
        breakpoint_percentile_threshold=breakpoint_percentile_threshold,
        embed_model=embed_model,
    )

    chunk_size=CONFIG['chunking']['sentence_splitter']['chunk_size']
    chunk_overlap=CONFIG['chunking']['sentence_splitter']['chunk_overlap']
    
    sentence_splitter = SentenceSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    
    title_extractor = TitleExtractor(llm=llm, nodes=CONFIG['ingestion']['title_extractor_nodes'])
    qa_extractor = QuestionsAnsweredExtractor(llm=llm, questions=CONFIG['ingestion']['qa_extractor_questions'])

    pipeline = IngestionPipeline(
        transformations=[
            sentence_splitter,
            # semantic_splitter,
            title_extractor,
            qa_extractor
        ]
    )
    
    return pipeline

def process_documents(
        pipeline, 
        docs_to_process, 
        source_document_id=None, 
        minio_object_name=None,
        building_id=None
):
    """
    Processes documents through the ingestion pipeline and enriches metadata.
    
    Args:
        pipeline: Ingestion pipeline
        docs_to_process: List of documents to process
        source_document_id: ID from source_documents table
        minio_object_name: MinIO object path
        building_id: ID from buildings_info table
        
    Returns:
        List of processed nodes
    """
    if not docs_to_process:
        logger.info("No new documents to process.")
        return []
    
    logger.info(f"Processing {len(docs_to_process)} document(s)...")
    nodes = pipeline.run(documents=docs_to_process)
    
    # Enrich node metadata with database references
    for i, node in enumerate(nodes):
        existing_metadata = node.metadata.copy()

        enriched_metadata = {
            **existing_metadata,
            "chunk_index": i,
            "total_chunks": len(nodes),
        }
        
        if source_document_id:
            enriched_metadata["source_document_id"] = source_document_id
        
        if minio_object_name:
            enriched_metadata["minio_object_name"] = minio_object_name
            enriched_metadata["minio_bucket"] = CONFIG['minio']['buckets']['raw_pdfs']
        
        if building_id:
            enriched_metadata["building_id"] = building_id
        
        node.metadata = enriched_metadata
    
    logger.info(f"Created {len(nodes)} nodes from documents.")
    return nodes
