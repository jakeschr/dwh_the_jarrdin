from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from app.schemas.user_schema import UserCreate, UserOut
from app.controllers import user_controller
from app.controllers.user_controller import get_db

router = APIRouter(
    prefix="/user",
    tags=["Users"]
)
@router.get("/", response_model=List[UserOut])
def get_users_route(db: Session = Depends(get_db)):
    return user_controller.get_users(db)
