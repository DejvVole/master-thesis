from typing import Dict
import argparse
import logging
import re

logger = logging.getLogger(__name__)

CATEGORY_TO_FIELD_MAPPING = {
    "Meno budovy": "meno_budovy",
    "Adresa": "adresa",
    "GPS súradnice": "gps_suradnice",
    "Rok výstavby": "rok_vystavby",
    "Aktuálny vlastník": "aktualny_vlastnik",
    
    "Rok zaradenia": "rok_zaradenia",
    "Historický význam": "historicky_vyznam",
    "Záznamy o obnove": "zaznamy_o_obnove",
    
    "Materiál vonkajšej fasády": "material_vonkajsej_fasady",
    "Typ strechy": "typ_strechy",
    "Materiál interiéru": "material_interieru",
    "Iné materiály": "ine_materialy",
    
    "Aktuálny stav": "aktualny_stav",
    "Kritické miesta": "kriticke_miesta",
    "Potrebné sanácie": "potrebne_sanacie",
    
    "Súčasné fotografie": "sucasne_fotografie",
    "Historické fotografie": "historicke_fotografie",
    "Plány a schémy": "plany_a_schemy",
    
    "Harmonogram údržby": "harmonogram_udrzby",
    "Revízne záznamy": "revizne_zaznamy",
    
    "Ochranné zóny": "ochranne_zony",
    "Povolenia na zásahy": "povolenia_na_zasahy",
    "Legislatívne obmedzenia": "legislativne_obmedzenia",
    
    "Digitálne výkresy": "digitalne_vykresy",
    
    "Archeologické výskumy": "archeologicke_vyskumy",
    "Chemické analýzy": "chemicke_analyzy",
}


def map_categories_to_fields(raw_output: dict) -> dict:
    """
    Map category names to database field names.
    """
    mapped_output = {}
    
    for category_name, answer in raw_output.items():
        field_name = CATEGORY_TO_FIELD_MAPPING.get(category_name)
        
        if field_name:
            mapped_output[field_name] = answer
        else:
            logger.warning(f"Unmapped category: '{category_name}'")
        
    return mapped_output


def get_all_field_names():
    """Return all database field names."""
    return list(set(CATEGORY_TO_FIELD_MAPPING.values()))


def get_category_name(field_name: str) -> str:
    """Return category name for a given field name."""
    for cat_name, f_name in CATEGORY_TO_FIELD_MAPPING.items():
        if f_name == field_name:
            return cat_name
    return field_name

def get_category_to_field_mapping() -> Dict[str, str]:
    """Return the category-to-field mapping."""
    return CATEGORY_TO_FIELD_MAPPING.copy()

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='RAG Pipeline for building analysis')
    parser.add_argument('file_path', type=str, help='Path to document file (PDF, DOC, DOCX)')
    parser.add_argument('original_filename', type=str, help='Original filename')
    parser.add_argument('minio_object_name', type=str, help='MinIO object name')
    parser.add_argument('--file-hash', type=str, default=None,
                       help='SHA-256 hash of file content for duplicate detection')
    parser.add_argument('--enable-inference', action='store_true', 
                       help='Enable LLM inference for missing categories')
    parser.add_argument('--no-inference', action='store_true',
                       help='Disable LLM inference (default)')
    
    args = parser.parse_args()
    
    if args.enable_inference:
        args.inference_enabled = True
    else:
        args.inference_enabled = False
    
    return args


def format_building_name(value: str) -> str:
    """
    Format building name to start with uppercase and end with period only for abbreviations.
    """
    if not value or not isinstance(value, str):
        return value

    name = value.strip()
    if not name:
        return value

    def capitalize_first_alpha(text: str) -> str:
        for idx, ch in enumerate(text):
            if ch.isalpha():
                return text[:idx] + ch.upper() + text[idx + 1:]
        return text

    def is_abbreviation(token: str) -> bool:
        t = token.strip()
        if not t:
            return False

        if t.count('.') >= 2:
            return True
        if re.fullmatch(r'(?:[A-Za-zÁ-ž]\.){2,}', t):
            return True

        t_clean = t.rstrip('.,;:')
        if not t_clean:
            return False
        if t_clean.isupper() and t_clean.isalpha():
            return True
        if len(t_clean) <= 3 and t_clean.isalpha():
            return True
        return False

    name = capitalize_first_alpha(name)

    tokens = name.split()
    if not tokens:
        return name

    last_token = tokens[-1]

    if name.endswith('.'):
        if not is_abbreviation(last_token):
            name = name.rstrip('.').rstrip()
    else:
        if is_abbreviation(last_token):
            name = name + '.'

    return name