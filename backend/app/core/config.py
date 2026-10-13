from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://kanban:kanban@localhost:5434/kanban"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 8

    # Lista de origens liberadas no CORS, separadas por vírgula (ex: "https://app.vercel.app,https://outro.com").
    cors_origins: str = "http://localhost:3000"

    # Segredo compartilhado que protege POST /notificacoes/jobs/vencendo-hoje, pensado
    # para ser chamado 1x/dia por um agendador externo (cron, GitHub Actions, etc.) via
    # header "X-Cron-Secret". Vazio (padrão) desativa a rota.
    cron_secret: str = ""

    storage_dir: str = "storage"
    max_upload_size_mb: int = 20
    allowed_upload_extensions: set[str] = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".png", ".jpg", ".jpeg", ".gif", ".txt", ".zip",
    }

    class Config:
        env_file = ".env"

    @field_validator("database_url")
    @classmethod
    def _force_psycopg2_driver(cls, value: str) -> str:
        # O Render (e outros provedores) entrega a URL como "postgres://" ou "postgresql://";
        # o driver instalado é o psycopg2, então normalizamos o prefixo.
        for prefix in ("postgres://", "postgresql://", "postgresql+psycopg://"):
            if value.startswith(prefix):
                return "postgresql+psycopg2://" + value[len(prefix):]
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
