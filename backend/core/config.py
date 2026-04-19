from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./collaborate.db"
    cors_origins: list[str] = ["http://localhost:5173"]
    vllm_base_url: str = "http://localhost:8001"
    chromadb_host: str = "localhost"
    chromadb_port: int = 8002
    model_name: str = "meta-llama/Meta-Llama-3-8B-Instruct"
    hf_token: str = ""
    secret_key: str = "change-me-in-production"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8080"

    class Config:
        env_file = ".env"


settings = Settings()
