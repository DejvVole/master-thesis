import yaml
from pathlib import Path


def load_config(config_path=None):
    """
    Load configuration from YAML file
    """
    if config_path is None:
        # Resolve path relative to this file's location
        config_path = Path(__file__).parent.parent / "config" / "config.yaml"
    else:
        config_path = Path(config_path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    return config


# Load config once at module level
CONFIG = load_config()