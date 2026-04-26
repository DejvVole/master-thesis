import json
from pathlib import Path
from ragas import evaluate
from ragas.metrics import (
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
    AnswerSimilarity
)
from datasets import Dataset
from utils.ground_truths import kastiel, kostol, mestiansky_dom, mestiansky_dom_2, synagoga
from utils.config_loader import CONFIG

def setup_evaluation_metrics(evaluator_llm):
    """
    Set up evaluation metrics using a given LLM
    """
    metrics = [
        Faithfulness(llm=evaluator_llm),
        ResponseRelevancy(llm=evaluator_llm),
        LLMContextPrecisionWithReference(llm=evaluator_llm),
        LLMContextRecall(llm=evaluator_llm),
        AnswerSimilarity()
    ]
    return metrics


def load_categories():
    """
    Load evaluation categories from a JSON file
    """
    categories_source = CONFIG['feature_flags']['use_test_categories']
    backend_root = Path(__file__).parent.parent
    if not categories_source:
        file_path = backend_root / CONFIG['evaluation']['categories_file']
    else:
        file_path = backend_root / CONFIG['evaluation']['test_categories_file']

    with open(file_path, 'r', encoding='utf-8') as file:
        categories = json.load(file)
    return categories


def load_ground_truth():
    return kastiel()


def evaluate_response(response, nodes, query_str, ground_truth, metrics):
    """
    Evaluate a response using RAGAS metrics
    """
    response_text = response.response

    if response_text not in CONFIG['missing_value_indicators']:
        questions = [query_str]
        answers = [str(response.response)]
        context_texts = [node.get_content() for node in nodes]
        contexts = [context_texts]
        ground_truths = [ground_truth]

        eval_dataset = Dataset.from_dict({
            "user_input": questions,
            "response": answers,
            "retrieved_contexts": contexts,
            "reference": ground_truths
        })

        eval_results = evaluate(
            eval_dataset,
            metrics=metrics
        )

        faithfulness = float(eval_results['faithfulness'][0])
        answer_relevancy = float(eval_results['answer_relevancy'][0])
        context_precision = float(eval_results['llm_context_precision_with_reference'][0])
        context_recall = float(eval_results['context_recall'][0])
        answer_similarity = float(eval_results['answer_similarity'][0])
        avg_score = (faithfulness + answer_relevancy + context_precision + context_recall + answer_similarity) / 5
    else:
        faithfulness = 0.0
        answer_relevancy = 0.0
        context_precision = 0.0
        context_recall = 0.0
        answer_similarity = 0.0
        avg_score = 0.0

    return {
        "faithfulness": faithfulness,
        "answer_relevancy": answer_relevancy,
        "context_precision": context_precision,
        "context_recall": context_recall,
        "answer_similarity": answer_similarity,
        "avg_score": avg_score
    }