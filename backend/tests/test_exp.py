import sys; sys.path.append("src")
from crypto import jwt as jwt_lib
from datetime import datetime, timedelta, timezone
kp = jwt_lib.generate_keypair("ES256")
now = datetime.now(timezone.utc)
# Token expired
expired = jwt_lib.sign({"sub": "user", "exp": int((now - timedelta(minutes=5)).timestamp())}, kp["private_key"])
# Token belum berlaku
notyet = jwt_lib.sign({"sub": "user", "nbf": int((now + timedelta(minutes=5)).timestamp())}, kp["private_key"])
for label, token in [("Expired", expired), ("Not Yet Valid", notyet)]:
    try:
        jwt_lib.verify(token, kp["public_key"], algorithms=["ES256"])
    except ValueError as e:
        print(f"[{label}] Ditolak: {e}")