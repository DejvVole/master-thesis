import psycopg2
import os

from utils.config_loader import CONFIG

def get_db_connection():
    """Create a PostgreSQL database connection."""
    database = os.getenv("DB_NAME")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")

    if not user or not password or not database:
        raise EnvironmentError("Database credentials are not defined in environment variables")

    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        database=database,
        user=user,
        password=password
    )

def normalize_value(val):
    if val in CONFIG['missing_value_indicators']:
        return None
    return val