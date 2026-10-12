# agents/llm.py
"""
Groq LLM configuration with fallback chain, Redis caching, and streaming support.

- Primary:  openai/gpt-oss-120b (high capability)
- Fallback: llama-3.1-8b-instant (fast, resilient to rate limits)
- Cache:    Redis-backed to prevent duplicate Groq calls
- Streaming: enabled for real-time token delivery to the frontend
"""
import redis as sync_redis
from langchain_groq import ChatGroq
from langchain_core.globals import set_llm_cache
from langchain_community.cache import RedisCache
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.runnables.fallbacks import RunnableWithFallbacks
from security.settings import get_settings

settings = get_settings()

# Redis-backed LLM cache (avoids duplicate Groq calls for identical prompts)
_cache_initialized = False

def _ensure_cache_initialized() -> None:
    global _cache_initialized
    if _cache_initialized:
        return
    try:
        sync_client = sync_redis.from_url(
            settings.REDIS_URL,
            decode_responses=False,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
        sync_client.ping()
        set_llm_cache(RedisCache(sync_client))
        _cache_initialized = True
    except Exception:
        # Cache is optional — app still works without Redis
        pass

# Model factories
def get_primary_llm() -> BaseChatModel:
    _ensure_cache_initialized()
    return ChatGroq(
        api_key=settings.GROQ_API_KEY.get_secret_value(),
        model=settings.GROQ_MODEL,
        temperature=0.1,
        max_retries=2,
        streaming=True,           # <- real-time token streaming
        timeout=60,
    )

def get_fallback_llm() -> BaseChatModel:
    return ChatGroq(
        api_key=settings.GROQ_API_KEY.get_secret_value(),
        model=settings.GROQ_FALLBACK_MODEL,
        temperature=0.1,
        max_retries=2,
        streaming=True,
        timeout=45,
    )

def get_llm_with_fallback() -> RunnableWithFallbacks:
    """Primary LLM with automatic failover to the fallback model."""
    return get_primary_llm().with_fallbacks([get_fallback_llm()])

# Singleton export — import this in your nodes
llm: RunnableWithFallbacks = get_llm_with_fallback()