import logging
from typing import Dict, List, Optional, Any
from llama_index.core.llms import LLM

from utils.config_loader import CONFIG
from db.db_operations import get_db_connection

logger = logging.getLogger(__name__)


# Mapovanie field_name -> category v DB
FIELD_TO_CATEGORY_MAP = {
    "typ_strechy": "typ_strechy",
    "material_vonkajsej_fasady": "material_fasady",
    "material_interieru": "material_interieru",
    "aktualny_stav": "aktualny_stav",
    "obdobie": "obdobie"
}

MULTISELECT_CATEGORIES = {"material_fasady", "material_interieru", "typ_strechy"}


def get_available_normalized_options(category: str) -> List[str]:
    """
    Získa zoznam dostupných normalizovaných hodnôt z DB pre danú kategóriu.
    
    Args:
        category: Názov kategórie (napr. 'typ_strechy')
        
    Returns:
        List hodnôt (napr. ['SEDLOVÁ', 'VALBOVÁ', ...])
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT value 
            FROM normalized_value_options 
            WHERE category = %s AND is_active = true
            ORDER BY sort_order, value
        """, (category,))
        
        rows = cur.fetchall()
        return [row[0] for row in rows]
        
    finally:
        cur.close()
        conn.close()


def normalize_single_value(
    llm: LLM,
    field_name: str,
    raw_value: str,
    category: str
) -> Dict[str, Any]:
    """
    Normalizuje jednu hodnotu pomocou LLM.
    
    Args:
        llm: LLM instance
        field_name: Názov fieldu (napr. 'typ_strechy')
        raw_value: Surová hodnota z RAG/INFERENCE
        category: Kategória v DB (napr. 'typ_strechy')
        
    Returns:
        Dict s normalizovanými hodnotami a metadátami
    """
    
    # Získaj dostupné možnosti z DB
    available_options = get_available_normalized_options(category)
    
    if not available_options:
        logger.warning(f"No normalized options found for category: {category}")
        return {"normalized_values": []}
    
    # LLM prompt pre normalizáciu
    is_multiselect = category in MULTISELECT_CATEGORIES
    
    prompt = f"""
        Máš k dispozícii nasledujúcu hodnotu z dokumentu o budove:
        POLE: {field_name}
        HODNOTA: {raw_value}

        Tvoja úloha je určiť normalizovanú hodnotu/hodnoty zo zoznamu možností:
        {', '.join(available_options)}

        {"Môžeš vybrať VIACERO hodnôt oddelených čiarkou." if is_multiselect else "Vyber JEDNU hodnotu."}

        PRAVIDLÁ:
        - Vyber hodnotu ktorá najlepšie vystihuje pôvodný text
        - Ak text hovorí o viacerých možnostiach, {"vyber všetky relevantné" if is_multiselect else "vyber dominantnú"}
        - Ak žiadna možnosť nesedí, použi 'INÁ' alebo 'KOMBINOVANÉ' ak existuje
        - Ak nevieš určiť, použi 'NEURČENÉ' (ak existuje v možnostiach)

        FORMÁT ODPOVEDE (JSON):
        {{
        "normalized_values": ["HODNOTA1"{', "HODNOTA2"' if is_multiselect else ''}],
        }}

        Odpovedz IBA v JSON formáte, bez ďalšieho textu.
        """
    
    try:
        response = llm.complete(prompt)
        response_text = str(response).strip()
        
        import json
        import re
        
        # Nájdi JSON v odpovedi
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            raise ValueError("No JSON found in LLM response")
        
        normalized_values = result.get("normalized_values", [])
        if isinstance(normalized_values, str):
            normalized_values = [normalized_values]
        
        # Filter len hodnoty ktoré existujú v možnostiach
        valid_values = [v for v in normalized_values if v in available_options]
        
        if not valid_values:
            logger.warning(f"LLM returned invalid values: {normalized_values}")
            return {
                "normalized_values": [],
            }
        
        return {"normalized_values": valid_values}
        
    except Exception as e:
        logger.error(f"Normalization failed for {field_name}: {str(e)}")
        return {"normalized_values": []}


def normalize_all_values(
    llm: LLM,
    complete_output: Dict[str, str]
) -> Dict[str, Dict[str, Any]]:
    """
    Normalizuje všetky hodnoty po RAG + INFERENCE kroku.
    
    Args:
        llm: LLM instance
        complete_output: Zlúčené výsledky z RAG + INFERENCE
        
    Returns:
        Dict[field_name] -> {
            "normalized_values": [...],
            "option_ids": [...],  # DB IDs
        }
    """
    
    normalized_results = {}
    
    for field_name, raw_value in complete_output.items():

        if not raw_value or str(raw_value).upper() in CONFIG['missing_value_indicators']:
            continue
        
        category = FIELD_TO_CATEGORY_MAP.get(field_name)
        if not category:
            continue
        
        logger.info(f"Normalizing: {field_name}")
        logger.info(f"  Raw value: {raw_value}")
        
        result = normalize_single_value(
            llm=llm,
            field_name=field_name,
            raw_value=raw_value,
            category=category
        )
        
        if result["normalized_values"]:
            option_ids = get_normalized_option_ids(category, result["normalized_values"])
            result["option_ids"] = option_ids
        else:
            result["option_ids"] = []

        normalized_results[field_name] = result
        
        logger.info(f"  ✓ Normalized: {result['normalized_values']}")
    
    rok_vystavby_field = complete_output.get("rok_vystavby")
    rok_vystavby_int = None
    obdobie_id = None
    
    if rok_vystavby_field:
        rok_vystavby_int = extract_year_from_text(rok_vystavby_field)
        if rok_vystavby_int:
            obdobie_id = get_obdobie_from_year(rok_vystavby_int)
    
    if obdobie_id is not None:
        normalized_results["obdobie"] = {
            "normalized_values": [],
            "option_ids": [obdobie_id]
        }

    return normalized_results


def get_normalized_option_ids(category: str, values: List[str]) -> List[int]:
    """
    Získa DB IDs pre normalizované hodnoty. 
    Ak hodnota neexistuje, vytvorí ju.
    
    Args:
        category: Kategória (napr. 'typ_strechy')
        values: List hodnôt (napr. ['SEDLOVÁ', 'VALBOVÁ'])
        
    Returns:
        List DB IDs
    """
    conn = get_db_connection()
    cur = conn.cursor()
    
    ids = []
    
    try:
        for value in values:
            # Skús nájsť existujúcu hodnotu
            cur.execute("""
                SELECT id FROM normalized_value_options
                WHERE category = %s AND value = %s
            """, (category, value))
            
            row = cur.fetchone()
            
            if row:
                ids.append(row[0])
            else:
                # Vytvor novú hodnotu (LLM generoval niečo nové)
                logger.info(f"Creating new normalized value: {category} = {value}")
                
                cur.execute("""
                    INSERT INTO normalized_value_options (category, value, display_label)
                    VALUES (%s, %s, %s)
                    RETURNING id
                """, (category, value, value))
                
                new_id = cur.fetchone()[0]
                ids.append(new_id)
                conn.commit()
        
        return ids
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to get normalized option IDs: {str(e)}")
        return []
        
    finally:
        cur.close()
        conn.close()


def extract_year_from_text(text: str) -> Optional[int]:
    """Extrahuje rok z textu."""
    import re
    
    if not text or text.upper() in CONFIG['missing_value_indicators']:
        return None
    
    # Rozpätie rokov (napr. "1350-1400") -> vráť stred (kontroluj PRED single year)
    range_match = re.search(r'(\d{4})\s*-\s*(\d{4})', text)
    if range_match:
        start = int(range_match.group(1))
        end = int(range_match.group(2))
        return (start + end) // 2

    # Hľadaj štvormiestne číslo
    year_match = re.search(r'\b(1\d{3}|20\d{2})\b', text)
    if year_match:
        return int(year_match.group(1))
    
    return None


def get_obdobie_from_year(year: int) -> Optional[int]:
    """
    Určí DB ID obdobia z roku.
    
    Args:
        year: Rok výstavby
        
    Returns:
        DB ID obdobia alebo None
    """
    
    # Mapovanie rokov -> hodnota obdobia
    epoch_mapping = {
        "STAROVEK": (0, 476),
        "STREDOVEK": (477, 1492),
        "NOVOVEK": (1493, 1799),
        "19_STOROCIE": (1800, 1899),
        "20_STOROCIE": (1900, 1999),
        "MODERNA": (2000, 2100)
    }
    
    for epoch_value, (start, end) in epoch_mapping.items():
        if start <= year <= end:
            # Získaj DB ID
            conn = get_db_connection()
            cur = conn.cursor()
            
            try:
                cur.execute("""
                    SELECT id FROM normalized_value_options
                    WHERE category = 'obdobie' AND value = %s
                """, (epoch_value,))
                
                row = cur.fetchone()
                return row[0] if row else None
                
            finally:
                cur.close()
                conn.close()
    
    return None