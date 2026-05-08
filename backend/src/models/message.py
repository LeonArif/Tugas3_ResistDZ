from ..database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    receiver_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    ciphertext = Column(String, nullable=False)
    iv = Column(String, nullable=False)
    mac = Column(String, nullable=False)
    mac_alg = Column(String, nullable=False)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
