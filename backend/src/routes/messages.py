from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database import get_db
from ..models.message import Message
from ..schema.message import MessageRequest, MessageResponse
from .dependencies import verify_token

router = APIRouter()

@router.post("/messages", response_model=dict)
def send_message(request: MessageRequest, token_payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    sender_email = token_payload.get("email")
    receiver_email = request.receiver_email
    
    if not sender_email:
        raise HTTPException(status_code=401, detail="Email not found in token")
    
    if sender_email == receiver_email:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")
    
    # Verifikasi keberadaan penerima
    receiver = db.query(User).filter(User.email == receiver_email).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    # Mmembuat entri pesan baru di database
    new_message = Message(
        sender_email=sender_email,
        receiver_email=receiver_email,
        ciphertext=request.ciphertext,
        iv=request.iv,
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return {
        "message": "Message sent successfully",
        "id": new_message.id,
        "timestamp": new_message.timestamp
    }

@router.get("/messages/{user_email}", response_model=list[MessageResponse])
def get_messages(user_email: str, token_payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    current_email = token_payload.get("email")
    
    if not current_email:
        raise HTTPException(status_code=401, detail="Email not found in token")
    
    # Verifikasi keberadaan pengguna lain
    other_user = db.query(User).filter(User.email == user_email).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Dapatkan semua pesan antara current_email dan user_email, diurutkan berdasarkan timestamp
    messages = db.query(Message).filter(
        or_(
            (Message.sender_email == current_email) & (Message.receiver_email == user_email),
            (Message.sender_email == user_email) & (Message.receiver_email == current_email),
        )
    ).order_by(Message.timestamp).all()
    
    return [
        MessageResponse(
            sender_email=msg.sender_email,
            receiver_email=msg.receiver_email,
            ciphertext=msg.ciphertext,
            iv=msg.iv,
            timestamp=msg.timestamp,
        )
        for msg in messages
    ]

# Import User model disini untuk menghindari impor berulang
from ..models.user import User
