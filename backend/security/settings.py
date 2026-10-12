# backend/security/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, Field, ValidationInfo, field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # --- App Configuration ---
    APP_ENV: str = "development"
    PROCESS_TTL_SECONDS: int = 3600
    MAX_SOURCE_FILE_BYTES: int = 1048576
    PROCESS_TIMEOUT_SECONDS: int = 300
    MAX_REPAIR_ATTEMPTS: int = 2

    # --- Redis ---
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # --- Groq AI ---
    GROQ_API_KEY: SecretStr = Field(...)
    GROQ_MODEL: str = Field(default="qwen/qwen3.8-27b")
    GROQ_FALLBACK_MODEL: str = Field(default="openai/gpt-oss-120b")

    # --- Security ---
    SECRET_KEY: SecretStr = Field(...)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALLOWED_GITHUB_DOMAINS: list[str] = ["github.com", "raw.githubusercontent.com"]

    # --- Rate Limiting ---
    PER_IP_LIMIT: int = 10
    PER_IP_WINDOW_SECONDS: int = 60
    GLOBAL_LIMIT: int = 1000
    GLOBAL_WINDOW_SECONDS: int = 3600

    # --- Sandbox ---
    SANDBOX_TIMEOUT_SECONDS: int = 30
    SANDBOX_MEMORY_LIMIT_MB: int = 256
    SANDBOX_CPU_LIMIT: float = 0.5

    # --- Frontend / CORS ---
    FRONTEND_URL: str = "http://localhost:3000"

    # --- LangSmith (Optional) ---
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "testpilot-ai"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: SecretStr, info: ValidationInfo) -> SecretStr:
        env = info.data.get("APP_ENV")
        secret_value = v.get_secret_value()
        if env == "production":
            if len(secret_value) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production.")
            if secret_value in ["supersecret", "changeme", "development"]:
                raise ValueError("SECRET_KEY cannot be a default value in production.")
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()