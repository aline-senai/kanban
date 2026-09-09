from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://kanban:kanban@localhost:5434/kanban"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 8

    # Lista de origens liberadas no CORS, separadas por vírgula (ex: "https://app.vercel.app,https://outro.com").
    cors_origins: str = "http://localhost:3000"

    # Envio de e-mails transacionais (recuperação de senha, nova atividade
    # atribuída, atividade vencendo hoje) via SMTP do Gmail. Se
    # gmail_user/gmail_app_password ficarem vazios, o envio é ignorado (modo
    # dev/local sem provedor configurado). gmail_app_password é gerada em
    # https://myaccount.google.com/apppasswords (exige verificação em duas
    # etapas ativada na conta).
    gmail_user: str = ""
    gmail_app_password: str = ""

    # URL pública do frontend, usada para montar o link de redefinição de senha.
    frontend_url: str = "http://localhost:3000"
    password_reset_token_expire_minutes: int = 60

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

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
