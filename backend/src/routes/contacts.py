from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schema.message import ContactResponse, PublicKeyResponse
from .dependencies import verify_token

router = APIRouter()

@router.get("/contacts", response_model=list[ContactResponse])
def get_contacts(token_payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    current_email = token_payload.get("email")
    
    if not current_email:
        raise HTTPException(status_code=401, detail="Email not found in token")
    
    contacts = db.query(User).filter(User.email != current_email).all()
    
    return [
        ContactResponse(email=contact.email, username=contact.username)
        for contact in contacts
    ]

@router.get("/users/{email}/public-key", response_model=PublicKeyResponse)
def get_public_key(email: str, token_payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return PublicKeyResponse(email=user.email, public_key=user.public_key)
