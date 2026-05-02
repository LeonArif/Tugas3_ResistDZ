from database import Base
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"
    username = Column(String, primary_key=True, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    password_salt = Column(String, nullable=False)
    public_key = Column(String, nullable=False)
    private_key_encrypted = Column(String, nullable=False)
    kdf_salt = Column(String, nullable=False)
    nonce_or_iv = Column(String, nullable=False)
    aes_mode = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
