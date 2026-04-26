import os
from llama_index.llms.openai import OpenAI
from llama_index.llms.groq import Groq
from llama_index.llms.mistralai import MistralAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings
from utils.config_loader import CONFIG

def get_openai_llm():
    return OpenAI(
        model=CONFIG['models']['gpt_llm'],
        api_key=os.environ.get("OPENAI_API_KEY"),
    )


def get_groq_llm():
    return Groq(
        model=CONFIG['models']['groq_llm'],
        api_key=os.environ.get("GROQ_API_KEY"),
    )


def get_mistral_llm():
    return MistralAI(
        model=CONFIG['models']['mistral_llm'],
        api_key=os.environ.get("MISTRAL_API_KEY"),
    )


def get_embedding_model():
    embed_model = OpenAIEmbedding(model=CONFIG['models']['embedding'])
    Settings.embed_model = embed_model
    return embed_model
