from pathlib import Path
from shutil import which

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_codex_cli_path() -> str:
    """Resolve a sensible default Codex CLI path for local development."""

    resolved = which("codex")
    if resolved:
        return resolved

    app_bundle_path = Path("/Applications/Codex.app/Contents/Resources/codex")
    if app_bundle_path.exists():
        return str(app_bundle_path)

    return "codex"


class Settings(BaseSettings):
    app_name: str = "Finance Agent API"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./finance_agent.db"
    chat_provider: str = "codex"
    codex_cli_path: str = _default_codex_cli_path()
    codex_workdir: str = "/Users/ellaxin/workspace/finance-platform"
    openai_api_key: str = ""
    openai_model: str = "gpt-5-mini"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("codex_cli_path", mode="after")
    @classmethod
    def normalize_codex_cli_path(cls, value: str) -> str:
        """Prefer an absolute executable path over a PATH-dependent command name."""

        if not value:
            return _default_codex_cli_path()

        path = Path(value).expanduser()
        if path.is_absolute() or "/" in value:
            return str(path)

        return which(value) or _default_codex_cli_path()


settings = Settings()
