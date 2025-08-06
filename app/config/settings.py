from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    ENV: Literal["development", "production"] = "development"
    PORT: int = 8000

    SECRET_KEY: str
    SESSION_NAME: str

    DB_DIAL: str
    DB_HOST: str
    DB_NAME: str
    DB_USER: str
    DB_PASS: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
