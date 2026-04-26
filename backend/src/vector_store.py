import chromadb
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core.vector_stores import MetadataFilters
from utils.config_loader import CONFIG


def setup_vector_store(collection_name=None, db_path=None):
    if collection_name is None:
        collection_name = CONFIG['storage']['collection_name']
    if db_path is None:
        db_path = CONFIG['storage']['chroma_db']
        
    db = chromadb.PersistentClient(path=db_path)
    chroma_collection = db.get_or_create_collection(collection_name, metadata={"hnsw:space": "cosine"})

    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    
    return vector_store, storage_context


def create_or_load_index(nodes, vector_store, storage_context, embed_model):
    if nodes:
        index = VectorStoreIndex(
            nodes, storage_context=storage_context, embed_model=embed_model
        )
    else:
        index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            storage_context=storage_context,
            embed_model=embed_model,
        )
    
    return index


def create_filtered_retriever(index, target_file_name=None):
    top_k = CONFIG['retrieval']['similarity_top_k']

    if target_file_name:
        filters = MetadataFilters.from_dicts([{"key": "file_name", "value": target_file_name}])
        return index.as_retriever(similarity_top_k=top_k, filters=filters)
    else:
        return index.as_retriever(similarity_top_k=top_k)
