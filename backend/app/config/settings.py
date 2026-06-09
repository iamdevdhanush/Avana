from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    port: int = 5000
    environment: str = "development"
    debug: bool = True

    frontend_url: str = "http://localhost:3000"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    openai_api_key: str = ""

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    rate_limit_max: int = 60
    rate_limit_window: int = 60

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def allowed_origins(self) -> list[str]:
        origins = [self.frontend_url, "http://localhost:3000"]
        if self.environment == "production":
            origins.append("https://avana.vercel.app")
            origins.append("https://avana-ai.vercel.app")
        return [o for o in origins if o]


@lru_cache
def get_settings() -> Settings:
    return Settings()
