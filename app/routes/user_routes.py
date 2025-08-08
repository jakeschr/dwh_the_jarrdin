from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from app.schemas.user_schema import UserCreate, UserOut
from app.controllers import user_controller
from app.controllers.user_controller import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.post("/", response_model=UserOut)
def create_user_route(user: UserCreate, db: Session = Depends(get_db)):
    return user_controller.create_user(user, db)

@router.get("/", response_model=List[UserOut])
def get_users_route(db: Session = Depends(get_db)):
    return user_controller.get_users(db)

@router.get("/{user_id}", response_model=UserOut)
def get_user_route(user_id: str, db: Session = Depends(get_db)):
    return user_controller.get_user(user_id, db)

@router.delete("/{user_id}")
def delete_user_route(user_id: str, db: Session = Depends(get_db)):
    return user_controller.delete_user(user_id, db)
