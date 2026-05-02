from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class RegisterResponse(BaseModel):
    username: str
    email: EmailStr
    message: str