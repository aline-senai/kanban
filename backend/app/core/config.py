from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://kanban:kanban@localhost:5434/kanban"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 8

    class Config:
        env_file = ".env"


settings = Settings()
