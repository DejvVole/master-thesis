import json
import logging
import sys
from pathlib import Path

from llama_index.core import get_response_synthesizer
from llama_index.core.postprocessor import LLMRerank
from llama_index.core.query_engine import RetrieverQueryEngine

from utils.progress_stage import ProgressStage
from utils.progress_stage import report_progress
from normalize_engine import extract_year_from_text, get_obdobie_from_year, get_obdobie_from_year, normalize_all_values
from inference_engine import SourceType, infer_missing_categories, merge_results
from utils.helper import get_category_to_field_mapping, map_categories_to_fields, parse_arguments, format_building_name
from db.save_handler import save_rag_output_to_database
from utils.config_loader import CONFIG
from utils.filename_encoding import normalize_possible_mojibake
from document_loader import load_single_doc
from llm_setup import get_openai_llm, get_embedding_model, get_groq_llm, get_mistral_llm
from ingestion import create_ingestion_pipeline, process_documents
from vector_store import setup_vector_store, create_or_load_index, create_filtered_retriever
from query_engine import create_custom_chat_prompt
from evaluation import (
    setup_evaluation_metrics, load_categories, load_ground_truth,
    evaluate_response
)
from ragas.llms import LlamaIndexLLMWrapper
from llama_index.core.schema import QueryBundle

logger = logging.getLogger(__name__)

def main():
    logger.info("="*70)
    logger.info("🚀 STARTING RAG PIPELINE")
    logger.info("="*70)

    args = parse_arguments()
    
    file_path = args.file_path
    original_filename = normalize_possible_mojibake(args.original_filename)
    minio_object_name = normalize_possible_mojibake(args.minio_object_name)
    enable_inference = args.inference_enabled
    file_hash = args.file_hash
    
    building_name = Path(original_filename).stem

    logger.info(f"📄 Processing file: {original_filename}")
    logger.info(f"🔍 Inference enabled: {enable_inference}")
    if file_hash:
        logger.info(f"🔑 File hash: {file_hash[:16]}...")

    report_progress(
        ProgressStage.DOCUMENT_LOADING,
        5,
        "Načítavam dokument...",
        f"Súbor: {original_filename}"
    )
    
    llm = get_openai_llm()
    #llm = get_groq_llm()
    #llm = get_mistral_llm()

    embed_model = get_embedding_model()

    report_progress(
        ProgressStage.DOCUMENT_LOADING,
        10,
        "Načítavam PDF dokument...",
        f"Spracovávam: {original_filename}"
    )
    
    file_name, docs = load_single_doc(file_path, original_filename, merge_pages=False)

    report_progress(
        ProgressStage.CHUNKING,
        15,
        "Rozdeľujem dokument na časti...",
        f"Počet strán: {len(docs)}"
    )

    pipeline = create_ingestion_pipeline(llm, embed_model)
    vector_store, storage_context = setup_vector_store()

    all_nodes = []

    if CONFIG['feature_flags']['use_stored_nodes']:
        all_nodes = None
    else:
        all_nodes = process_documents(
            pipeline, 
            docs, 
            source_document_id=None,
            minio_object_name=minio_object_name,
            building_id=None
        )
        logger.info(f"✓ Created {len(all_nodes)} chunks")

        report_progress(
            ProgressStage.EMBEDDING,
            25,
            f"Embeddingy vytvorené",
            f"Vytvorených {len(all_nodes)} chunkov"
        )

    index = create_or_load_index(all_nodes, vector_store, storage_context, embed_model)
    vector_retriever = create_filtered_retriever(index, target_file_name=file_name)
    
    llm_reranker = LLMRerank(
        llm=llm,
        top_n=CONFIG['retrieval']['rerank_top_n'],
    )

    if CONFIG['feature_flags']['enable_metrics']:
        evaluator_llm = LlamaIndexLLMWrapper(get_openai_llm())
        metrics = setup_evaluation_metrics(evaluator_llm)
    else:
        metrics = None
        evaluator_llm = None

    ground_truth_mapping = load_ground_truth()
    categories = load_categories()
    total_categories = len(categories)

    # =========================================================================
    # KROK 1: RAG EXTRAKCIA
    # =========================================================================
    logger.debug(f"\n{'='*70}")
    logger.info("STEP 1: RAG EXTRACTION")
    logger.debug(f"{'='*70}\n")

    report_progress(
        ProgressStage.RAG_EXTRACTION,
        30,
        "Spúšťam RAG extrakciu...",
        f"Spracúvam {total_categories} kategórií",
        0,
        total_categories
    )
    
    raw_output = {}
    all_evaluation_results = {}

    # nodes_data = {
    #     "document": file_name,
    #     "building": building_name,
    #     "categories": {}
    # }

    field_mapping = get_category_to_field_mapping()

    for i, category in enumerate(categories):
        category_name = category["name"]
        category_description = category["description"]
        synonyms = category.get("synonyms", [])

        # Calculate progress within RAG extraction (30-60%)
        extraction_progress = 30 + int((i / total_categories) * 30)
        
        report_progress(
            ProgressStage.RAG_EXTRACTION,
            extraction_progress,
            f"Extrakcia: {category_name}",
            f"Kategória {i + 1} z {total_categories}",
            i + 1,
            total_categories
        )
        
        logger.debug(f"\n{'=' * 70}")
        logger.debug(f"PROCESSING CATEGORY {i + 1}/{len(categories)}: {category_name}")
        logger.debug(f"DESCRIPTION: {category_description}")
        logger.debug(f"\n{'=' * 70}")

        custom_chat_prompt = create_custom_chat_prompt(category_description=category_description)

        response_synthesizer = get_response_synthesizer(
            llm=llm,
            text_qa_template=custom_chat_prompt,
        )

        query_engine = RetrieverQueryEngine.from_args(
            retriever=vector_retriever,
            node_postprocessors=[llm_reranker],
            response_synthesizer=response_synthesizer,
        )

        if synonyms:
            query_str = f"Názov: {category_name}\nSynonymá: {', '.join(synonyms)}"
        else:
            query_str = f"Názov: {category_name}"

        query_bundle = QueryBundle(query_str=query_str)
        response = query_engine.query(query_bundle)
        nodes_for_eval = response.source_nodes

        answer = str(response).strip()
        raw_output[category_name] = answer

        logger.debug(f"\n{'=' * 70}")
        logger.debug(f"ANSWER: {answer}")

        # nodes_data["categories"][category_name] = {
        #     "query": query_str,
        #     "answer": answer,
        #     "nodes": [
        #         {
        #             "index": idx,
        #             "content": node.get_content(),
        #             "metadata": node.metadata,
        #             "score": node.score if hasattr(node, 'score') else None
        #         }
        #         for idx, node in enumerate(nodes_for_eval)
        #     ]
        # }

        if metrics and evaluator_llm:
            ground_truth = ground_truth_mapping.get(category_name)
            if ground_truth:
                evaluation_result = evaluate_response(
                    response=response,
                    nodes=nodes_for_eval,
                    query_str=query_str,
                    ground_truth=ground_truth,
                    metrics=metrics
                )
                all_evaluation_results[category_name] = evaluation_result

    extracted_output = map_categories_to_fields(raw_output)

    # =========================================================================
    # KROK 2: INFERENCE PRE CHÝBAJÚCE KATEGÓRIE (IBA AK JE POVOLENÝ)
    # =========================================================================
    source_metadata = None
    complete_output = extracted_output
    missing_value_key = CONFIG['missing_value_indicators']

    if enable_inference:
        logger.debug(f"\n{'='*70}")
        logger.info(f"STEP 2: INFERENCE FOR MISSING CATEGORIES")
        logger.debug(f"{'='*70}\n")

        report_progress(
            ProgressStage.INFERENCE,
            65,
            "Spúšťam AI inference pre chýbajúce hodnoty...",
            "LLM odhaduje chýbajúce informácie"
        )

        missing_values = sum(
            1 for v in extracted_output.values() 
            if v is None or str(v).upper() in missing_value_key
        )
        logger.debug(f"Found {missing_values} missing categories, attempting inference...")

        inference_results = infer_missing_categories(
            llm=llm,
            extracted_results=extracted_output,
            categories=categories,
            field_mapping=field_mapping
        )

        complete_results = merge_results(inference_results)

        extracted_count = sum(1 for r in complete_results.values() if r["source_type"] == SourceType.EXTRACTED.value)
        inferred_count = sum(1 for r in complete_results.values() if r["source_type"] == SourceType.INFERRED.value)
        missing_count = sum(1 for r in complete_results.values() if r["source_type"] == SourceType.MISSING.value)

        report_progress(
            ProgressStage.INFERENCE,
            75,
            f"Inference dokončená",
            f"Extrahované: {extracted_count}, Odhadnuté: {inferred_count}, Chýbajúce: {missing_count}"
        )

        logger.debug(f"\n{'='*70}")
        logger.debug(f"RESULTS SUMMARY")
        logger.debug(f"{'='*70}")
        logger.debug(f"  EXTRACTED (from document): {extracted_count}")
        logger.debug(f"  INFERRED (estimated):      {inferred_count}")
        logger.debug(f"  MISSING (unknown):         {missing_count}")
        logger.debug(f"{'='*70}\n")

        complete_output = {
            field: result["value"] 
            for field, result in complete_results.items()
        }

        source_metadata = {
            field: {
                "source_type": result["source_type"],
                "confidence": result["confidence"],
                "reasoning": result["reasoning"]
            }
            for field, result in complete_results.items()
        }
    
        # backend_root = Path(__file__).parent.parent.parent
        # nodes_file = backend_root / CONFIG['evaluation']['nodes_output_file']

        # nodes_data["source_metadata"] = source_metadata
        # nodes_data["summary"] = {
        #     "extracted": extracted_count,
        #     "inferred": inferred_count,
        #     "missing": missing_count
        # }

        # with open(nodes_file, 'w', encoding='utf-8') as f:
        #     json.dump(nodes_data, f, indent=2, ensure_ascii=False)
    else:
        logger.debug(f"\n{'='*70}")
        logger.info(f"STEP 2: INFERENCE SKIPPED (disabled by user)")
        logger.debug(f"{'='*70}\n")

        report_progress(
            ProgressStage.INFERENCE,
            70,
            "Inference preskočená",
            "Inference bola vypnutá používateľom"
        )
        
        # Vytvor source_metadata IBA pre EXTRACTED hodnoty
        source_metadata = {}
        for field_name, value in extracted_output.items():
            if value and str(value).upper() not in missing_value_key:
                source_metadata[field_name] = {
                    "source_type": "EXTRACTED",
                    "confidence": "HIGH",
                    "reasoning": "Extrahované priamo z dokumentu"
                }
            else:
                source_metadata[field_name] = {
                    "source_type": "MISSING",
                    "confidence": None,
                    "reasoning": "Informácia nebola nájdená v dokumente"
                }
        
        extracted_count = sum(1 for v in source_metadata.values() if v["source_type"] == "EXTRACTED")
        missing_count = sum(1 for v in source_metadata.values() if v["source_type"] == "MISSING")
        inferred_count = 0

    if complete_output.get("meno_budovy"):
        complete_output["meno_budovy"] = format_building_name(complete_output["meno_budovy"])

    # =========================================================================
    # KROK 3: NORMALIZÁCIA
    # =========================================================================
    logger.debug(f"\n{'='*70}")
    logger.info(f"STEP 3: NORMALIZATION")
    logger.debug(f"{'='*70}\n")

    report_progress(
        ProgressStage.NORMALIZATION,
        80,
        "Normalizujem hodnoty...",
        "Zjednocujem formát dát"
    )
    
    normalized_results = normalize_all_values(
        llm=llm,
        complete_output=complete_output
    )
    logger.debug(f"\n{'='*70}")
    logger.debug(normalized_results)
    logger.debug(f"{'='*70}\n")

    # =========================================================================
    # KROK 4: ULOŽENIE DO DB
    # =========================================================================
    if CONFIG['feature_flags']['save_to_database']:
        logger.debug(f"\n{'='*70}")
        logger.info(f"SAVING RESULTS")
        logger.debug(f"{'='*70}\n")

        report_progress(
            ProgressStage.DATABASE_SAVE,
            85,
            "Ukladám výsledky do databázy...",
            "Zapisujem extrahované dáta"
        )

        rok_vystavby_field = complete_output.get("rok_vystavby")
        rok_vystavby_int = None
        
        if rok_vystavby_field:
            rok_vystavby_int = extract_year_from_text(rok_vystavby_field)
        
        budova_id = save_rag_output_to_database(
            complete_output=complete_output,
            normalized_results=normalized_results,
            rok_vystavby_int=rok_vystavby_int,
            target_pdf=file_name,
            building_name=building_name,
            evaluation_results=all_evaluation_results if all_evaluation_results else None,
            nodes=all_nodes,
            minio_object_name=minio_object_name,
            source_metadata=source_metadata,
            inference_enabled=enable_inference,
            extracted_count=extracted_count,
            inferred_count=inferred_count,
            missing_count=missing_count,
            file_hash=file_hash
        )
        
        if budova_id:
            logger.info(f"\n✓ Successfully saved building with ID: {budova_id}")
            
            report_progress(
                ProgressStage.MINIO_EXPORT,
                95,
                "Exportujem výsledky...",
                f"Budova uložená s ID: {budova_id}"
            )
        else:
            logger.error("\n✗ Failed to save to database")
            report_progress(
                ProgressStage.ERROR,
                0,
                "Chyba pri ukladaní do databázy",
                "Nepodarilo sa uložiť výsledky"
            )
        
    report_progress(
        ProgressStage.COMPLETE,
        100,
        "Spracovanie dokončené!",
        f"Extrahované: {extracted_count}, Odhadnuté: {inferred_count}, Chýbajúce: {missing_count}"
    )
            
    logger.debug("\n" + "="*70)
    logger.debug("PIPELINE FINISHED")
    logger.debug("="*70 + "\n")

if __name__ == "__main__":
    main()
