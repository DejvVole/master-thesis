import logging
from pathlib import Path
import tempfile
import json
from typing import Optional, Dict, Any
from datetime import datetime
from minio.error import S3Error
from storage.minio_client import MinIOClient
import unicodedata

logger = logging.getLogger(__name__)

class MinIOOperations:
    """Operácie pre ukladanie a načítavanie súborov z MinIO."""
    
    def __init__(self):
        """Inicializuje MinIO operácie."""
        self.minio_client = MinIOClient()
        self.client = self.minio_client.client
        self.buckets = self.minio_client.get_buckets()

    @staticmethod
    def _sanitize_metadata_value(value: str) -> str:
        """
        Konvertuje hodnotu na ASCII-safe formát pre MinIO metadáta.
        
        Args:
            value: Pôvodná hodnota s diaktitikou
            
        Returns:
            ASCII-safe hodnota
        """
        if not isinstance(value, str):
            value = str(value)
        
        # Odstráň diakritiku a konvertuj na ASCII
        # NFD = dekomponuj znaky (š -> s + ˇ), potom odstráň diakritické znaky
        nfd = unicodedata.normalize('NFD', value)
        ascii_value = ''.join(char for char in nfd if unicodedata.category(char) != 'Mn')
        
        # Alternatíva: nahraď problematické znaky
        replacements = {
            'š': 's', 'Š': 'S',
            'č': 'c', 'Č': 'C',
            'ť': 't', 'Ť': 'T',
            'ž': 'z', 'Ž': 'Z',
            'ý': 'y', 'Ý': 'Y',
            'á': 'a', 'Á': 'A',
            'é': 'e', 'É': 'E',
            'í': 'i', 'Í': 'I',
            'ó': 'o', 'Ó': 'O',
            'ú': 'u', 'Ú': 'U',
            'ľ': 'l', 'Ľ': 'L',
            'ň': 'n', 'Ň': 'N',
            'ŕ': 'r', 'Ŕ': 'R',
            'ä': 'a', 'Ä': 'A',
            'ô': 'o', 'Ô': 'O',
            'ď': 'd', 'Ď': 'D',
        }
        
        for sk_char, ascii_char in replacements.items():
            ascii_value = ascii_value.replace(sk_char, ascii_char)
        
        return ascii_value

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """
        Konvertuje názov súboru na safe formát (bez diakritiky, lowercase).
        
        Args:
            filename: Pôvodný názov súboru
            
        Returns:
            Sanitizovaný názov súboru
        """
        # Odstráň diakritiku
        nfd = unicodedata.normalize('NFD', filename)
        ascii_name = ''.join(char for char in nfd if unicodedata.category(char) != 'Mn')
        
        # Lowercase a nahraď medzery podčiarkovníkmi
        safe_name = ascii_name.lower().replace(' ', '_')
        
        # Odstráň špeciálne znaky okrem _, -, .
        safe_name = ''.join(c for c in safe_name if c.isalnum() or c in ('_', '-', '.'))
        
        return safe_name
    
    def export_rag_results(
            self, 
            building_name: str,
            complete_output: Dict[str, Any],
            evaluation_results: Optional[Dict] = None,
            metadata: Optional[Dict] = None) -> Optional[Dict[str, str]]:
        """
        Exportuje RAG výsledky do MinIO v priečinku budovy.
        
        Args:
            building_name: Názov budovy
            complete_output: Kompletný RAG output
            evaluation_results: Voliteľné evaluation metriky
            metadata: Voliteľné dodatočné metadáta
            
        Returns:
            Dict s object names jednotlivých exportovaných súborov
        """
        try:
            now = datetime.now()
            
            safe_building_name = self._sanitize_filename(building_name)
            timestamp = now.strftime("%Y%m%d_%H%M%S")
            export_prefix = f"{safe_building_name}/{timestamp}"
            
            exported_files = {}
            
            # 1. HLAVNÝ JSON OUTPUT
            json_object_name = f"{export_prefix}/rag_output.json"
            json_content = {
                "building_name": building_name,
                "export_timestamp": now.isoformat(),
                "rag_output": complete_output,
                "evaluation": evaluation_results,
                "metadata": metadata or {}
            }
            
            json_uploaded = self._upload_json_to_minio(
                json_object_name,
                json_content,
                bucket_name=self.buckets['exports']
            )
            
            if json_uploaded:
                exported_files['json'] = json_object_name
                logger.info(f"RAG JSON export: {json_object_name}")
            
            
            # 2. METADATA JSON (pre rýchly prehľad)
            metadata_object_name = f"{export_prefix}/metadata.json"
            metadata_content = {
                "building_name": building_name,
                "safe_building_name": safe_building_name,
                "export_timestamp": now.isoformat(),
                "timestamp": timestamp,
                "file_count": len(exported_files) + 1,  # +1 for this file
                "categories_processed": len(complete_output) if isinstance(complete_output, dict) else 0,
                "has_evaluation": evaluation_results is not None,
                "export_path": export_prefix
            }
            
            metadata_uploaded = self._upload_json_to_minio(
                metadata_object_name,
                metadata_content,
                bucket_name=self.buckets['exports']
            )
            
            if metadata_uploaded:
                exported_files['metadata'] = metadata_object_name
                logger.info(f"Metadata export: {metadata_object_name}")
            
            logger.info(f"RAG export completed: {len(exported_files)} files in {export_prefix}")
            return exported_files
            
        except Exception as e:
            logger.error(f"Chyba pri exporte RAG výsledkov: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _upload_json_to_minio(
            self, object_name: str, 
            data: Dict, 
            bucket_name: str
    ) -> bool:
        """Helper pre upload JSON do MinIO."""
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', encoding='utf-8', delete=False) as tmp:
                json.dump(data, tmp, ensure_ascii=False, indent=2)
                tmp_path = tmp.name
            
            self.client.fput_object(
                bucket_name=bucket_name,
                object_name=object_name,
                file_path=tmp_path,
                content_type='application/json'
            )
            
            Path(tmp_path).unlink()  # Zmaž dočasný súbor
            return True
            
        except Exception as e:
            logger.error(f"Chyba pri upload JSON: {e}")
            return False