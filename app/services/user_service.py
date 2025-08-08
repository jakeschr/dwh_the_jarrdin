from sqlalchemy.orm import Session
from app.schemas.user_schema import UserCreate
from app.models.user_model import User
from app.repositories import user_repository
from typing import List, Optional
import uuid

# Generate user_id mirip "usrXXXXXXXXXXXX"
def generate_user_id() -> str:
    return "usr" + uuid.uuid4().hex[:12]

# Buat user baru dengan validasi email
def create_user(db: Session, user: UserCreate) -> User:
    existing = user_repository.get_user_by_email(db, user.email)
    if existing:
        raise ValueError("Email already in use.")

    generated_id = generate_user_id()
    return user_repository.create_user(db, user, generated_id)

# Ambil semua user
def get_users(db: Session) -> List[User]:
    return user_repository.get_all_users(db)

# Ambil satu user by id
def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return user_repository.get_user_by_id(db, user_id)

# Hapus user
def delete_user(db: Session, user_id: str) -> bool:
    return user_repository.delete_user(db, user_id)
