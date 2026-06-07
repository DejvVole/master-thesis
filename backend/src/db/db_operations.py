from datetime import datetime
import json
import logging

import os
from typing import Dict, Any, Optional

from utils.config_loader import CONFIG
from db.helper import get_db_connection, normalize_value
from utils.filename_encoding import normalize_possible_mojibake

logger = logging.getLogger(__name__)

def create_processing_record(
        source_document_id: int, 
        minio_object_name: str, 
        chroma_collection: str,
) -> Optional[int]:
    """
    Create a document processing record.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    normalized_minio_object_name = normalize_possible_mojibake(minio_object_name)
    
    try:
        insert_query = """
            INSERT INTO document_processing (
                source_document_id, 
                minio_object_name, 
                minio_bucket,
                chroma_collection_name,
                processing_started_at
            ) VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (source_document_id, minio_object_name) 
            DO UPDATE SET
                processing_started_at = EXCLUDED.processing_started_at
            RETURNING id;
        """
        
        cur.execute(insert_query, (
            source_document_id,
            normalized_minio_object_name,
            os.getenv("MINIO_BUCKET_RAW", "raw-pdfs"),
            chroma_collection,
            datetime.now()
        ))
        
        processing_id = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Processing record created with ID: {processing_id}")
        return processing_id
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating processing record: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        cur.close()
        conn.close()


def save_source_document(
    file_name: str, 
    minio_object_name: str, 
    metadata: Optional[Dict] = None,
    file_hash: Optional[str] = None
) -> int:
    """
    Save source PDF document information.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    normalized_file_name = normalize_possible_mojibake(file_name)
    normalized_minio_object_name = normalize_possible_mojibake(minio_object_name)
    
    try:
        if file_hash:
            insert_query = """
                INSERT INTO source_documents (file_name, file_hash, file_path, metadata, processed_date)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (file_hash) DO UPDATE 
                SET file_name = EXCLUDED.file_name,
                    file_path = EXCLUDED.file_path,
                    metadata = EXCLUDED.metadata,
                    processed_date = EXCLUDED.processed_date
                RETURNING id;
            """
        else:
            insert_query = """
                INSERT INTO source_documents (file_name, file_hash, file_path, metadata, processed_date)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id;
            """
        
        metadata_json = json.dumps(metadata) if metadata else None
        
        cur.execute(insert_query, (
            normalized_file_name,
            file_hash,
            normalized_minio_object_name,
            metadata_json,
            datetime.now()
        ))
        
        doc_id = cur.fetchone()[0]
        conn.commit()
        logger.info(f"Source document saved with ID: {doc_id}, MinIO object: {minio_object_name}, hash: {file_hash[:16] if file_hash else 'N/A'}...")
        return doc_id
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving source document: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def save_building_to_db(
    output_data: Dict[str, Any],
    rok_vystavby_normalized: Optional[int],
    source_document_id: Optional[int] = None
) -> int:
    """
    Save RAG output to database.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        zaznamy_o_obnove = None
        if output_data.get("zaznamy_o_obnove"):
            if isinstance(output_data["zaznamy_o_obnove"], list):
                zaznamy_o_obnove = "\n".join(output_data["zaznamy_o_obnove"])
            else:
                zaznamy_o_obnove = str(output_data["zaznamy_o_obnove"])

        insert_query = """
            INSERT INTO buildings_info (
                source_document_id,
                meno_budovy, adresa, gps_suradnice, rok_vystavby, aktualny_vlastnik,
                rok_zaradenia, historicky_vyznam, zaznamy_o_obnove,
                material_vonkajsej_fasady, typ_strechy, material_interieru, ine_materialy,
                aktualny_stav, kriticke_miesta, potrebne_sanacie,
                sucasne_fotografie, historicke_fotografie, plany_a_schemy,
                harmonogram_udrzby, revizne_zaznamy, ochranne_zony,
                povolenia_na_zasahy, legislativne_obmedzenia, digitalne_vykresy,
                archeologicke_vyskumy, chemicke_analyzy,
                rok_vystavby_normalized
            ) VALUES (
                %(source_document_id)s,
                %(meno_budovy)s, %(adresa)s, %(gps_suradnice)s, %(rok_vystavby)s, %(aktualny_vlastnik)s,
                %(rok_zaradenia)s, %(historicky_vyznam)s, %(zaznamy_o_obnove)s,
                %(material_vonkajsej_fasady)s, %(typ_strechy)s, %(material_interieru)s, %(ine_materialy)s,
                %(aktualny_stav)s, %(kriticke_miesta)s, %(potrebne_sanacie)s,
                %(sucasne_fotografie)s, %(historicke_fotografie)s, %(plany_a_schemy)s,
                %(harmonogram_udrzby)s, %(revizne_zaznamy)s, %(ochranne_zony)s,
                %(povolenia_na_zasahy)s, %(legislativne_obmedzenia)s, %(digitalne_vykresy)s,
                %(archeologicke_vyskumy)s, %(chemicke_analyzy)s,
                %(rok_vystavby_normalized)s
            ) RETURNING id;
        """
        
        data = {
            'source_document_id': source_document_id,
            'meno_budovy': normalize_value(output_data.get('meno_budovy')),
            'adresa': normalize_value(output_data.get('adresa')),
            'gps_suradnice': normalize_value(output_data.get('gps_suradnice')),
            'rok_vystavby': normalize_value(output_data.get('rok_vystavby')),
            'aktualny_vlastnik': normalize_value(output_data.get('aktualny_vlastnik')),
            'rok_zaradenia': normalize_value(output_data.get('rok_zaradenia')),
            'historicky_vyznam': normalize_value(output_data.get('historicky_vyznam')),
            'zaznamy_o_obnove': normalize_value(zaznamy_o_obnove),
            'material_vonkajsej_fasady': normalize_value(output_data.get('material_vonkajsej_fasady')),
            'typ_strechy': normalize_value(output_data.get('typ_strechy')),
            'material_interieru': normalize_value(output_data.get('material_interieru')),
            'ine_materialy': normalize_value(output_data.get('ine_materialy')),
            'aktualny_stav': normalize_value(output_data.get('aktualny_stav')),
            'kriticke_miesta': normalize_value(output_data.get('kriticke_miesta')),
            'potrebne_sanacie': normalize_value(output_data.get('potrebne_sanacie')),
            'sucasne_fotografie': normalize_value(output_data.get('sucasne_fotografie')),
            'historicke_fotografie': normalize_value(output_data.get('historicke_fotografie')),
            'plany_a_schemy': normalize_value(output_data.get('plany_a_schemy')),
            'harmonogram_udrzby': normalize_value(output_data.get('harmonogram_udrzby')),
            'revizne_zaznamy': normalize_value(output_data.get('revizne_zaznamy')),
            'ochranne_zony': normalize_value(output_data.get('ochranne_zony')),
            'povolenia_na_zasahy': normalize_value(output_data.get('povolenia_na_zasahy')),
            'legislativne_obmedzenia': normalize_value(output_data.get('legislativne_obmedzenia')),
            'digitalne_vykresy': normalize_value(output_data.get('digitalne_vykresy')),
            'archeologicke_vyskumy': normalize_value(output_data.get('archeologicke_vyskumy')),
            'chemicke_analyzy': normalize_value(output_data.get('chemicke_analyzy')),
            'rok_vystavby_normalized': rok_vystavby_normalized
        }

        cur.execute(insert_query, data)
        budova_id = cur.fetchone()[0]
        
        conn.commit()
        logger.info(f"Building saved to database with ID: {budova_id}")
        return budova_id
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving to database: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def save_category_embeddings(budova_id: int, output_data: Dict[str, Any], embed_model) -> bool:
    """
    Create embeddings for all categories and save to buildings_info_embed.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        FIELD_TO_EMB_COLUMN = {
            'meno_budovy': 'meno_budovy_emb',
            'adresa': 'adresa_emb',
            'gps_suradnice': 'gps_suradnice_emb',
            'rok_vystavby': 'rok_vystavby_emb',
            'aktualny_vlastnik': 'aktualny_vlastnik_emb',
            'rok_zaradenia': 'rok_zaradenia_emb',
            'historicky_vyznam': 'historicky_vyznam_emb',
            'zaznamy_o_obnove': 'zaznamy_o_obnove_emb',
            'material_vonkajsej_fasady': 'material_vonkajsej_fasady_emb',
            'typ_strechy': 'typ_strechy_emb',
            'material_interieru': 'material_interieru_emb',
            'ine_materialy': 'ine_materialy_emb',
            'aktualny_stav': 'aktualny_stav_emb',
            'kriticke_miesta': 'kriticke_miesta_emb',
            'potrebne_sanacie': 'potrebne_sanacie_emb',
            'sucasne_fotografie': 'sucasne_fotografie_emb',
            'historicke_fotografie': 'historicke_fotografie_emb',
            'plany_a_schemy': 'plany_a_schemy_emb',
            'harmonogram_udrzby': 'harmonogram_udrzby_emb',
            'revizne_zaznamy': 'revizne_zaznamy_emb',
            'ochranne_zony': 'ochranne_zony_emb',
            'povolenia_na_zasahy': 'povolenia_na_zasahy_emb',
            'legislativne_obmedzenia': 'legislativne_obmedzenia_emb',
            'digitalne_vykresy': 'digitalne_vykresy_emb',
            'archeologicke_vyskumy': 'archeologicke_vyskumy_emb',
            'chemicke_analyzy': 'chemicke_analyzy_emb',
        }
        
        embeddings_data = {'budova_id': budova_id}
        embed_count = 0
        
        for field_name, emb_column in FIELD_TO_EMB_COLUMN.items():
            value = output_data.get(field_name)
            
            if not value or str(value).strip().upper() in CONFIG['missing_value_indicators']:
                embeddings_data[emb_column] = None
                continue
            
            logger.info(f"Generating embedding for '{field_name}'...")
            embedding = embed_model.get_text_embedding(str(value))
            embeddings_data[emb_column] = embedding
            embed_count += 1
        
        columns = list(embeddings_data.keys())
        placeholders = ', '.join(['%s'] * len(columns))
        columns_str = ', '.join(columns)
        
        update_str = ', '.join([f"{col} = EXCLUDED.{col}" for col in columns if col != 'budova_id'])
        
        insert_query = f"""
            INSERT INTO buildings_info_embed ({columns_str})
            VALUES ({placeholders})
            ON CONFLICT (budova_id)
            DO UPDATE SET {update_str};
        """
        
        cur.execute(insert_query, list(embeddings_data.values()))
        conn.commit()
        
        logger.info(f"✓ Saved {embed_count} embeddings for building {budova_id}")
        return True
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving category embeddings: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cur.close()
        conn.close()
    
def save_source_metadata(budova_id: int, source_metadata: Dict[str, Dict]) -> bool:
    """
    Save source metadata for each category field.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        for field_name, metadata in source_metadata.items():
            source_type = metadata.get("source_type")
            confidence = metadata.get("confidence")
            reasoning = metadata.get("reasoning")
            
            cur.execute("""
                INSERT INTO buildings_info_sources 
                (budova_id, field_name, source_type, confidence, reasoning)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (budova_id, field_name) 
                DO UPDATE SET 
                    source_type = EXCLUDED.source_type,
                    confidence = EXCLUDED.confidence,
                    reasoning = EXCLUDED.reasoning
            """, (budova_id, field_name, source_type, confidence, reasoning))
        
        conn.commit()
        logger.info(f"Saved source metadata for {len(source_metadata)} fields")
        return True
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving source metadata: {e}")
        return False
        
    finally:
        cur.close()
        conn.close()

def save_normalized_values_to_db(
    building_id: int,
    normalized_results: Dict[str, Dict[str, Any]],
) -> int:
    """
    Save normalized values to M:N table.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    saved_count = 0
    
    try:
        for _, result in normalized_results.items():
            option_ids = result.get("option_ids", [])
            
            for option_id in option_ids:
                try:
                    cur.execute("""
                        INSERT INTO buildings_normalized_values 
                        (building_id, normalized_option_id)
                        VALUES (%s, %s)
                        ON CONFLICT (building_id, normalized_option_id) DO NOTHING
                    """, (building_id, option_id))
                    
                    saved_count += cur.rowcount
                    
                except Exception as e:
                    logger.warning(f"Failed to save normalized value {option_id}: {str(e)}")
                    continue
        
        conn.commit()
        return saved_count
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to save normalized values: {str(e)}")
        return 0
        
    finally:
        cur.close()
        conn.close()