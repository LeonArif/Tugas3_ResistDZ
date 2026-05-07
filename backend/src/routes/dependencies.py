from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from ..crypto import jwt as jwt_utils

security = HTTPBearer()

def verify_token(credentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        # Get public key server untuk verify token
        server_keypair = jwt_utils.get_server_jwt_keypair()
        decoded = jwt_utils.verify(
            token, 
            server_keypair["public_key"],
            algorithms=["ES256"],
        )
        return decoded["payload"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
