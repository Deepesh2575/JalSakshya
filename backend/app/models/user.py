from datetime import datetime
import enum
from sqlalchemy import Column, String, DateTime, Enum, Boolean
from app.db.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OFFICER = "OFFICER"
    FIELD_WORKER = "FIELD_WORKER"

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=True)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.FIELD_WORKER, nullable=False)
    district = Column(String(100), default="Datia")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
