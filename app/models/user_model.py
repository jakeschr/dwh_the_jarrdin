from sqlalchemy import Column, String, Text, Boolean, BigInteger
from app.database import Base

class User(Base):
    __tablename__ = "user"  # nama tabel sama seperti di Sequelize

    user_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    password = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    timestamp = Column(BigInteger, nullable=False)
