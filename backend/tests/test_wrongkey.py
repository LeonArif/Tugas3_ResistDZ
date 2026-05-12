import sys; sys.path.append("src")
from crypto import jwt as jwt_lib
kp1 = jwt_lib.generate_keypair("ES256")
kp2 = jwt_lib.generate_keypair("ES256")
token = jwt_lib.sign({"sub": "user"}, kp1["private_key"], "ES256")
try:
    jwt_lib.verify(token, kp2["public_key"], algorithms=["ES256"])
    print("ERROR: Seharusnya ditolak!")
except ValueError as e:
    print(f"Token ditolak: {e}")