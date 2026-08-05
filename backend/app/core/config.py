from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://kanban:kanban@localhost:5434/kanban"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 8

    # Lista de origens liberadas no CORS, separadas por vírgula (ex: "https://app.vercel.app,https://outro.com").
    cors_origins: str = "http://localhost:3000"

    # SMTP para envio de e-mails transacionais (recuperação de senha). Se smtp_host
    # ficar vazio, o envio é ignorado (modo dev/local sem provedor configurado).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@quadrosenai.local"
    smtp_use_tls: bool = True

    # URL pública do frontend, usada para montar o link de redefinição de senha.
    frontend_url: str = "http://localhost:3000"
    password_reset_token_expire_minutes: int = 60

    storage_dir: str = "storage"
    max_upload_size_mb: int = 20
    allowed_upload_extensions: set[str] = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".png", ".jpg", ".jpeg", ".gif", ".txt", ".zip",
    }

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
