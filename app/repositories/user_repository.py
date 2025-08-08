from sqlalchemy.orm import Session
from app.models.user_model import User
from app.schemas.user_schema import UserCreate
from typing import List, Optional

# Ambil semua user
def get_all_users(db: Session) -> List[User]:
    return db.query(User).all()

# Ambil satu user by id
def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.user_id == user_id).first()

# Ambil user by email
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

# Simpan user baru
def create_user(db: Session, user: UserCreate, generated_id: str) -> User:
    db_user = User(
        user_id=generated_id,
        name=user.name,
        email=user.email,
        password=user.password,
        timestamp=user.timestamp,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Hapus user
def delete_user(db: Session, user_id: str) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True
