# app/config/redis_config.py
import redis.asyncio as aioredis
from typing import Optional
from security.settings import get_settings

settings = get_settings()

class RedisManager:
    _pool: Optional[aioredis.Redis] = None

    @classmethod
    async def initialize(cls):
        """Initialize the Redis connection pool."""
        if cls._pool is None:
            cls._pool = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
            )
            # Test connection
            try:
                await cls._pool.ping()
            except Exception as e:
                # In production, you might want to log this and fail gracefully
                print(f"Warning: Could not connect to Redis: {e}")

    @classmethod
    async def close(cls):
        """Close the Redis connection pool."""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None

    @classmethod
    def get_client(cls) -> aioredis.Redis:
        """Get the Redis client. Raises if not initialized."""
        if cls._pool is None:
            raise RuntimeError("Redis not initialized. Call initialize() first.")
        return cls._pool

    @classmethod
    async def is_healthy(cls) -> bool:
        """Health check for Redis."""
        if cls._pool is None:
            return False
        try:
            return await cls._pool.ping()
        except Exception:
            return False

# FastAPI Lifespan integration
from contextlib import asynccontextmanager

@asynccontextmanager
async def redis_lifespan(app):
    await RedisManager.initialize()
    yield
    await RedisManager.close()