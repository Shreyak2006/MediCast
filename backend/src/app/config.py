from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, read from the environment or a local .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Development default matches the local Postgres instance used by the project.
    database_url: str = "postgresql://postgres:postgres@localhost:5432/Medicast"


settings = Settings()
