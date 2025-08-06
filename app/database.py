from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config.settings import settings

# Format DSN: mysql://username:password@host/dbname
DATABASE_URL = f"{settings.DB_DIAL}://{settings.DB_USER}:{settings.DB_PASS}@{settings.DB_HOST}/{settings.DB_NAME}"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
