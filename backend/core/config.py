from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./collaborate.db"
    cors_origins: list[str] = ["http://localhost:5173"]
    vllm_base_url: str = "http://localhost:8001"
    chromadb_host: str = "localhost"
    chromadb_port: int = 8002
    model_name: str = "Qwen/Qwen2.5-7B-Instruct"
    hf_token: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
