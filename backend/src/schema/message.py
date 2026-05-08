from pydantic import BaseModel
from datetime import datetime

class MessageRequest(BaseModel):
    receiver_email: str
    ciphertext: str
    iv: str
    mac: str
    mac_alg: str

class MessageResponse(BaseModel):
    sender_email: str
    receiver_email: str
    ciphertext: str
    iv: str
    mac: str
    mac_alg: str
    timestamp: datetime

    class Config:
        from_attributes = True

class PublicKeyResponse(BaseModel):
    email: str
    public_key: str

class ContactResponse(BaseModel):
    email: str
    username: str

    class Config:
        from_attributes = True
