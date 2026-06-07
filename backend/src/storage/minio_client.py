import logging
import os
from minio import Minio
from minio.error import S3Error

from utils.config_loader import CONFIG

logger = logging.getLogger(__name__)

class MinIOClient:
    """Client for MinIO object storage."""
    
    def __init__(self):
        """
        Initialize MinIO client.
        """
        self.config = CONFIG["minio"]
        self.client = self._create_client()
        self._ensure_buckets_exist()
    
    def _create_client(self) -> Minio:
        """Create MinIO client."""

        endpoint = os.getenv("MINIO_ENDPOINT", "localhost")
        port = os.getenv("MINIO_PORT", "9000")
        access_key = os.getenv("MINIO_ACCESS_KEY")
        secret_key = os.getenv("MINIO_SECRET_KEY")
        secure = os.getenv("MINIO_SECURE", "false")

        if not access_key or not secret_key:
            raise EnvironmentError("MinIO credentials are not defined in environment variables")

        try:
            client = Minio(
                endpoint=f"{endpoint}:{port}",
                access_key=access_key,
                secret_key=secret_key,
                secure=secure.lower() == "true"
            )
            logger.info(f"MinIO client connected to {endpoint}:{port}")
            return client
        except Exception as e:
            logger.error(f"Error creating MinIO client: {e}")
            raise
    
    def _ensure_buckets_exist(self):
        """Create buckets if they don't exist."""
        for bucket_name in self.config['buckets'].values():
            try:
                if not self.client.bucket_exists(bucket_name):
                    self.client.make_bucket(bucket_name)
                    logger.info(f"Bucket '{bucket_name}' created")
                else:
                    logger.debug(f"Bucket '{bucket_name}' already exists")
            except S3Error as e:
                logger.error(f"Error creating bucket '{bucket_name}': {e}")
                raise
    
    def health_check(self) -> bool:
        """Check MinIO connection."""
        try:
            self.client.list_buckets()
            logger.info("MinIO health check: OK")
            return True
        except Exception as e:
            logger.error(f"MinIO health check failed: {e}")
            return False
    
    def get_buckets(self) -> dict:
        """Return bucket names dictionary."""
        return self.config['buckets']