from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Finance Agent API"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/finance_agent"
    chat_provider: str = "codex"
    codex_cli_path: str = "codex"
    codex_workdir: str = "/Users/ellaxin/workspace/finance-platform"
    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
