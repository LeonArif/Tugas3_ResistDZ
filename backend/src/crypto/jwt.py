import base64
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Literal, Optional
import uuid

from . import ecdsa as ecdsa_utils


SERVER_JWT_PRIVATE_KEY_PATH = Path(__file__).resolve().parent / "_server_jwt_private.pem"
SERVER_JWT_PUBLIC_KEY_PATH = Path(__file__).resolve().parent / "_server_jwt_public.pem"

_ALGORITHM_HASH_MAP = {
    "ES256": "ES256",
    "ES384": "ES384",
    "ES512": "ES512",
}


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = (-len(data)) % 4
    return base64.urlsafe_b64decode(data + ("=" * padding))


def _json_dumps(value: Dict[str, Any]) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)


def _json_loads(data: str) -> Dict[str, Any]:
    parsed = json.loads(data)
    if not isinstance(parsed, dict):
        raise ValueError("JWT segment is not a JSON object")
    return parsed


def generate_keypair(algorithm: Literal["ES256", "ES384", "ES512"] = "ES256") -> Dict[str, str]:
    return ecdsa_utils.generate_keypair(algorithm)


def _normalize_header(header: Optional[Dict[str, Any]], algorithm: str) -> Dict[str, Any]:
    merged_header: Dict[str, Any] = {"alg": algorithm, "typ": "JWT"}
    if header:
        merged_header.update(header)
    merged_header["alg"] = algorithm
    merged_header["typ"] = "JWT"
    return merged_header


def sign(
    payload: Dict[str, Any],
    private_key_pem: str,
    algorithm: Literal["ES256", "ES384", "ES512"] = "ES256",
    header: Optional[Dict[str, Any]] = None,
) -> str:
    merged_header = _normalize_header(header, algorithm)
    header_base64 = _b64url_encode(_json_dumps(merged_header).encode("utf-8"))
    payload_base64 = _b64url_encode(_json_dumps(payload).encode("utf-8"))
    message = (header_base64 + '.' + payload_base64).encode("utf-8")
    signature = ecdsa_utils.sign_raw(message, private_key_pem, algorithm)
    signature_base64 = _b64url_encode(signature)
    
    return header_base64 + '.' + payload_base64 + '.' + signature_base64


def verify(
    token: str,
    public_key_pem: str,
    algorithms: Optional[list[str]] = None,
    options: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    if options is None:
        options = {}

    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Token is invalid")

    header_b64, payload_b64, signature_b64 = parts
    try:
        header = _json_loads(_b64url_decode(header_b64).decode("utf-8"))
        payload = _json_loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception as exc:
        raise ValueError("Token is invalid") from exc

    algorithm = header.get("alg")
    if algorithm not in _ALGORITHM_HASH_MAP:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    allowed_algs = algorithms or options.get("algs")
    if allowed_algs is not None and algorithm not in allowed_algs:
        raise ValueError("Algorithm not allowed")

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature_raw = ecdsa_utils.b64url_to_raw(signature_b64)
    if not ecdsa_utils.verify_raw(signing_input, signature_raw, public_key_pem, algorithm):
        raise ValueError("Signature verification failed")

    now = int(datetime.now(timezone.utc).timestamp())

    if not options.get("ignoreExp", False) and "exp" in payload and now > int(payload["exp"]):
        raise ValueError("Token expired")

    if not options.get("ignoreNbf", False) and "nbf" in payload and now < int(payload["nbf"]):
        raise ValueError("Token not yet valid")

    if options.get("iss") is not None and payload.get("iss") != options["iss"]:
        raise ValueError("Issuer mismatch")

    if options.get("sub") is not None and payload.get("sub") != options["sub"]:
        raise ValueError("Subject mismatch")

    if options.get("aud") is not None and payload.get("aud") != options["aud"]:
        raise ValueError("Audience mismatch")

    if options.get("jti") is not None and payload.get("jti") != options["jti"]:
        raise ValueError("JWT ID mismatch")

    return {"header": header, "payload": payload, "signature": signature_b64}


def get_server_jwt_keypair(algorithm: Literal["ES256", "ES384", "ES512"] = "ES256") -> Dict[str, str]:
    if SERVER_JWT_PRIVATE_KEY_PATH.exists() and SERVER_JWT_PUBLIC_KEY_PATH.exists():
        return {
            "private_key": SERVER_JWT_PRIVATE_KEY_PATH.read_text(encoding="utf-8"),
            "public_key": SERVER_JWT_PUBLIC_KEY_PATH.read_text(encoding="utf-8"),
        }

    keypair = generate_keypair(algorithm)
    SERVER_JWT_PRIVATE_KEY_PATH.write_text(keypair["private_key"], encoding="utf-8")
    SERVER_JWT_PUBLIC_KEY_PATH.write_text(keypair["public_key"], encoding="utf-8")
    return keypair


def create_token(
    username: str,
    email: str,
    private_key_pem: str,
    algorithm: Literal["ES256", "ES384", "ES512"] = "ES256",
    expires_in_minutes: int = 60,
    issuer: str = "auth-service",
) -> str:
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(minutes=expires_in_minutes)

    payload = {
        "iss": issuer,
        "sub": username,
        "aud": "crypto-chat-web",
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
        "jti": uuid.uuid4().hex,
        "username": username,
        "email": email,
    }

    return sign(payload, private_key_pem, algorithm)

