from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import SessionLocal
from app.schemas.user_schema import UserCreate, UserOut
from app.services import user_service

# Dependency untuk inject database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Endpoint untuk create user
def create_user(user: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    try:
        return user_service.create_user(db, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Endpoint untuk get all users
def get_users(db: Session = Depends(get_db)) -> List[UserOut]:
    return user_service.get_users(db)

# Endpoint untuk get user by id
def get_user(user_id: str, db: Session = Depends(get_db)) -> UserOut:
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Endpoint untuk delete user
def delete_user(user_id: str, db: Session = Depends(get_db)) -> dict:
    success = user_service.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
