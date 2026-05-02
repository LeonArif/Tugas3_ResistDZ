from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schema.user import RegisterRequest, RegisterResponse
from models.user import User
from crypto import hash_function as crypto_hash
from crypto import ecdh
from crypto import aes

router = APIRouter()

@router.post("/register",response_model=RegisterResponse)
def register_user(request: RegisterRequest, db:Session = Depends(get_db)):
    check_username = db.query(User).filter(User.username == request.username).first()
    if check_username != None:
        raise HTTPException(status_code=409, detail="Username already registered")
    
    check_email = db.query(User).filter(User.email == request.email).first()
    if check_email != None:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # Hash password dengan PBKDF2
    password_hash_result = crypto_hash.hash_password(request.password)
    password_hash = password_hash_result["hash"]
    password_salt = password_hash_result["salt"]
    
    # ECDH keypair (X25519)
    keypair = ecdh.generate_keypair()
    public_key = keypair["public_key"]
    private_key = keypair["private_key"]
    
    # Generate KDF salt untuk derive key dari password
    kdf_salt_gen = crypto_hash.generate_salt()
    derived_key = crypto_hash.derive_key(request.password, salt_b64=kdf_salt_gen)
    
    # Encrypt private key dengan AES-GCM
    encrypt_result = aes.encrypt_text(private_key, derived_key)
    private_key_encrypted = encrypt_result["ciphertext"]
    nonce_or_iv = encrypt_result["nonce"]
    aes_mode = encrypt_result["mode"]
    
    # Insert user baru ke database
    new_user = User(
        username=request.username,
        email=request.email,
        password_hash=password_hash,
        password_salt=password_salt,
        public_key=public_key,
        private_key_encrypted=private_key_encrypted,
        kdf_salt=kdf_salt_gen,
        nonce_or_iv=nonce_or_iv,
        aes_mode=aes_mode,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return RegisterResponse(
        username=request.username,
        email=request.email,
        message="Registration successful"
    )
    