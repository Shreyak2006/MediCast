from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Environment variables still win. Among dotenv files, later entries override
# earlier ones, so a backend-local .env remains an explicit per-machine override.
ENV_FILES = [
    PROJECT_ROOT / ".env.local",
    PROJECT_ROOT / ".env",
    Path(".env"),
]


class Settings(BaseSettings):
    """Application configuration, read from the environment or a local env file."""

    model_config = SettingsConfigDict(env_file=ENV_FILES, extra="ignore")

    # Development default matches the local Postgres instance used by the project.
    database_url: str = "postgresql://postgres:postgres@localhost:5432/Medicast"


settings = Settings()
