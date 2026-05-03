import logging
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass
from llama_index.core.prompts import RichPromptTemplate
from llama_index.core.llms import LLM

from utils.config_loader import CONFIG

logger = logging.getLogger(__name__)

class SourceType(str, Enum):
    EXTRACTED = "EXTRACTED"
    INFERRED = "INFERRED"
    MISSING = "MISSING"


class ConfidenceLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

missing_value_key = CONFIG['missing_value_indicators']

@dataclass
class CategoryResult:
    """Výsledok pre jednu kategóriu."""
    category_name: str
    value: Optional[str]
    source_type: SourceType
    confidence: Optional[ConfidenceLevel] = None
    reasoning: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "value": self.value,
            "source_type": self.source_type.value,
            "confidence": self.confidence.value if self.confidence else None,
            "reasoning": self.reasoning
        }


def create_inference_prompt() -> RichPromptTemplate:
    prompt_str = """
        {% chat role="system" %}
        Si expert na historické budovy a architektúru. 
        Tvojou úlohou je na základe poskytnutých informácií a tvojich vedomostí odhadnúť čo najpravdepodobnejšiu odpoveď pre danú kategóriu.

        Pri odhade postupuj takto:
        1. Najprv využi známe informácie o budove, ktoré ti poskytnem.
        2. Ak známe informácie nestačia, môžeš použiť všeobecné znalosti o historických budovách a architektúre.
        3. Ak ani tak nevieš vytvoriť rozumný odhad, odpovedz presne: NEVIEM ODHADNÚŤ

        DÔLEŽITÉ:
        - Uprednostňuj údaje zo ZNÁMYCH INFORMÁCIÍ pred všeobecnými znalosťami.
        - Neuvádzaj nič ako istý fakt, ak ide len o pravdepodobný odhad.
        - Ak je odpoveď založená hlavne na všeobecných znalostiach, musí to byť zrejmé zo zdôvodnenia.

        PRAVIDLÁ PRE DÔVERYHODNOSŤ:
        - HIGH = odpoveď je silno podložená známymi údajmi alebo veľmi jednoznačnou kombináciou údajov
        - MEDIUM = odpoveď je pravdepodobná, ale časť je odvodená
        - LOW = odpoveď je len slabý odhad
        - Ak neexistuje rozumný odhad, použi NEVIEM ODHADNÚŤ a LOW

        FORMÁT ODPOVEDE:
        ODPOVEĎ: <konkrétna odhodnutá odpoveď pre kategóriu alebo NEVIEM ODHADNÚŤ>
        DÔVERYHODNOSŤ: <LOW / MEDIUM / HIGH>
        ZDÔVODNENIE: <jedna veta>

        {% endchat %}

        {% chat role="user" %}
        ZNÁME INFORMÁCIE O BUDOVE:
        {{ known_info }}

        KATEGÓRIA NA ODHAD: {{ category_name }}
        POPIS KATEGÓRIE: {{ category_description }}

        Pokus sa odpovedať na danú kategóriu. Pamätaj - do ODPOVEĎ patrí tvoja odhadnutá odpoveď na kategóriu, nie úroveň istoty!
        {% endchat %}
        """
    return RichPromptTemplate(prompt_str)


def parse_inference_response(response_text: str) -> tuple[Optional[str], Optional[ConfidenceLevel], Optional[str]]:
    """Parsuje odpoveď z inference LLM."""
    value = None
    confidence = None
    reasoning = None
    lines = response_text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if line.startswith("ODPOVEĎ:"):
            raw_value = line.replace("ODPOVEĎ:", "").strip()
            # Ignoruj ak je hodnota "NEVIEM ODHADNÚŤ" alebo ak LLM omylom vložilo confidence level
            if raw_value.upper() not in ["NEVIEM ODHADNÚŤ","LOW", "MEDIUM", "HIGH", ""]:
                value = raw_value
        elif line.startswith("DÔVERYHODNOSŤ:"):
            conf_str = line.replace("DÔVERYHODNOSŤ:", "").strip().upper()
            if conf_str in ["LOW", "MEDIUM", "HIGH"]:
                confidence = ConfidenceLevel(conf_str)
        elif line.startswith("ZDÔVODNENIE:"):
            reasoning = line.replace("ZDÔVODNENIE:", "").strip()
    
    # Ak je value rovnaké ako confidence (LLM sa pomýlilo), vynuluj value
    if value and value.upper() in ["LOW", "MEDIUM", "HIGH"]:
        logger.warning(f"LLM vložilo confidence level do ODPOVEĎ: {value}, ignorujem")
        value = None
    
    return value, confidence, reasoning


def build_known_info_context(extracted_results: Dict[str, str]) -> str:
    """Zostaví kontext zo všetkých známych informácií o budove."""
    known_parts = []
    
    # Preklad field names na čitateľné názvy
    field_translations = {
        "meno_budovy": "Meno budovy",
        "adresa": "Adresa",
        "gps_suradnice": "GPS súradnice",
        "rok_vystavby": "Rok výstavby",
        "aktualny_vlastnik": "Aktuálny vlastník",
        "rok_zaradenia": "Rok zaradenia",
        "historicky_vyznam": "Historický význam",
        "zaznamy_o_obnove": "Záznamy o obnove",
        "material_vonkajsej_fasady": "Materiál vonkajšej fasády",
        "typ_strechy": "Typ strechy",
        "material_interieru": "Materiál interiéru",
        "ine_materialy": "Iné materiály",
        "aktualny_stav": "Aktuálny stav",
        "kriticke_miesta": "Kritické miesta",
        "potrebne_sanacie": "Potrebné sanácie",
        "sucasne_fotografie": "Súčasné fotografie",
        "historicke_fotografie": "Historické fotografie",
        "plany_a_schemy": "Plány a schémy",
        "harmonogram_udrzby": "Harmonogram údržby",
        "revizne_zaznamy": "Revízne záznamy",
        "ochranne_zony": "Ochranné zóny",
        "povolenia_na_zasahy": "Povolenia na zásahy",
        "legislativne_obmedzenia": "Legislatívne obmedzenia",
        "digitalne_vykresy": "Digitálne výkresy",
        "archeologicke_vyskumy": "Archeologické výskumy",
        "chemicke_analyzy": "Chemické analýzy"
    }
    
    # Prejdi všetky extrahované výsledky a pridaj tie, ktoré majú hodnotu
    for field, value in extracted_results.items():
        if value and value not in missing_value_key:
            readable_name = field_translations.get(field, field.replace("_", " ").title())
            known_parts.append(f"- {readable_name}: {value}")
    
    if not known_parts:
        return "Žiadne známe informácie o budove."
    
    return "\n".join(known_parts)


def infer_missing_categories(
    llm: LLM,
    extracted_results: Dict[str, str],
    categories: List[Dict[str, Any]],
    field_mapping: Dict[str, str]
) -> Dict[str, CategoryResult]:
    """
    Pokúsi sa odhadnúť hodnoty pre kategórie, ktoré neboli nájdené v dokumente.
    Inference sa robí IBA pre špecifické kategórie.
    
    Args:
        llm: LLM model pre inference
        extracted_results: Výsledky z RAG pipeline (field_name: value)
        categories: Zoznam kategórií s popismi
        field_mapping: Mapovanie category_name -> field_name
        
    Returns:
        Dict s CategoryResult pre každú kategóriu
    """
    
    INFERENCE_ALLOWED_FIELDS = {
        "material_vonkajsej_fasady",
        "typ_strechy",
        "material_interieru",
        "historicky_vyznam"
    }
    
    results = {}
    inference_prompt = create_inference_prompt()
    known_info = build_known_info_context(extracted_results)
    
    for category in categories:
        category_name = category["name"]
        category_description = category.get("description", "")
        field_name = field_mapping.get(category_name)
        
        if not field_name:
            logger.warning(f"Nenájdené mapovanie pre kategóriu: {category_name}")
            continue
        
        current_value = extracted_results.get(field_name)
        
        # Kontrola či bola hodnota extrahovaná
        if current_value and current_value.upper() not in missing_value_key:
            # Hodnota bola nájdená v dokumente
            results[field_name] = CategoryResult(
                category_name=category_name,
                value=current_value,
                source_type=SourceType.EXTRACTED,
                confidence=ConfidenceLevel.HIGH,
                reasoning="Extrahované priamo z dokumentu"
            )
        else:
            # Kontrola či je táto kategória v whitelist pre inference
            if field_name not in INFERENCE_ALLOWED_FIELDS:
                results[field_name] = CategoryResult(
                    category_name=category_name,
                    value=None,
                    source_type=SourceType.MISSING,
                    confidence=None,
                    reasoning="Informácia nebola nájdená v dokumente a inference nie je povolený pre túto kategóriu"
                )
                logger.debug(f"Skipping inference for {category_name} (not in whitelist)")
                continue
            
            # Pokus o inference (iba pre whitelisted kategórie)
            logger.debug(f"Inferring value for: {category_name}")
            
            try:
                response = llm.complete(
                    inference_prompt.format(
                        known_info=known_info,
                        category_name=category_name,
                        category_description=category_description
                    )
                )

                inferred_value, confidence, reasoning = parse_inference_response(str(response))
                
                if inferred_value and confidence:
                    results[field_name] = CategoryResult(
                        category_name=category_name,
                        value=inferred_value,
                        source_type=SourceType.INFERRED,
                        confidence=confidence,
                        reasoning=reasoning
                    )
                    logger.info(f"  -> Inferred: {inferred_value} ({confidence.value})")
                else:
                    results[field_name] = CategoryResult(
                        category_name=category_name,
                        value=None,
                        source_type=SourceType.MISSING,
                        confidence=None,
                        reasoning=reasoning or "Nepodarilo sa odhadnúť hodnotu"
                    )
                    logger.info(f"  -> Could not infer")
                    
            except Exception as e:
                logger.error(f"Error inferring {category_name}: {e}")
                results[field_name] = CategoryResult(
                    category_name=category_name,
                    value=None,
                    source_type=SourceType.MISSING,
                    confidence=None,
                    reasoning=f"Chyba pri inference: {str(e)}"
                )
    
    return results


def merge_results(
    inference_results: Dict[str, CategoryResult]
) -> Dict[str, Dict[str, Any]]:
    """
    Zlúči výsledky z extrakcie a inference do finálnej štruktúry.
    
    Returns:
        Dict s kompletnými informáciami pre každú kategóriu
    """
    merged = {}
    
    for field_name, category_result in inference_results.items():
        merged[field_name] = category_result.to_dict()
    
    return merged
