import sys
import json
from enum import Enum
from typing import Optional

class ProgressStage(Enum):
    UPLOAD = "upload"
    DOCUMENT_LOADING = "document_loading"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    RAG_EXTRACTION = "rag_extraction"
    INFERENCE = "inference"
    NORMALIZATION = "normalization"
    DATABASE_SAVE = "database_save"
    MINIO_EXPORT = "minio_export"
    COMPLETE = "complete"
    ERROR = "error"

def report_progress(
    stage: ProgressStage,
    progress: int,
    message: str,
    detail: Optional[str] = None,
    current_category: Optional[int] = None,
    total_categories: Optional[int] = None
):
    """
    Report progress to stdout in JSON format for SSE streaming.
    """
    progress_data = {
        "type": "progress",
        "stage": stage.value,
        "progress": progress,
        "message": message,
    }
    
    if detail:
        progress_data["detail"] = detail
    
    if current_category is not None and total_categories is not None:
        progress_data["current_category"] = current_category
        progress_data["total_categories"] = total_categories
    
    print(f"PROGRESS:{json.dumps(progress_data)}", flush=True)
    sys.stdout.flush()