import base64
from typing import Dict, Literal

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
    load_pem_private_key,
    load_pem_public_key,
)


_CURVE_MAP = {
    "ES256": ec.SECP256R1(),
    "ES384": ec.SECP384R1(),
    "ES512": ec.SECP521R1(),
}

_HASH_MAP = {
    "ES256": hashes.SHA256(),
    "ES384": hashes.SHA384(),
    "ES512": hashes.SHA512(),
}


def _int_to_fixed_bytes(value: int, length: int) -> bytes:
    return value.to_bytes(length, "big")


def _fixed_bytes_to_int(data: bytes) -> int:
    return int.from_bytes(data, "big")


def _der_to_raw(der_sig: bytes, key_size_bits: int) -> bytes:
    r, s = decode_dss_signature(der_sig)
    size = (key_size_bits + 7) // 8
    return _int_to_fixed_bytes(r, size) + _int_to_fixed_bytes(s, size)


def _raw_to_der(raw_sig: bytes, key_size_bits: int) -> bytes:
    size = (key_size_bits + 7) // 8
    if len(raw_sig) != 2 * size:
        raise ValueError("Invalid raw signature length")
    r = _fixed_bytes_to_int(raw_sig[:size])
    s = _fixed_bytes_to_int(raw_sig[size:])
    return encode_dss_signature(r, s)


def generate_keypair(algorithm: Literal["ES256", "ES384", "ES512"] = "ES256") -> Dict[str, str]:
    if algorithm not in _CURVE_MAP:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    private_key = ec.generate_private_key(_CURVE_MAP[algorithm])
    public_key = private_key.public_key()

    return {
        "private_key": private_key.private_bytes(
            encoding=Encoding.PEM,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption(),
        ).decode("utf-8"),
        "public_key": public_key.public_bytes(
            encoding=Encoding.PEM,
            format=PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8"),
    }


def sign_raw(
    message: bytes,
    private_key_pem: str,
    algorithm: Literal["ES256", "ES384", "ES512"] = "ES256",
) -> bytes:
    if algorithm not in _CURVE_MAP:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    private_key = load_pem_private_key(private_key_pem.encode("utf-8"), password=None)
    der_signature = private_key.sign(message, ec.ECDSA(_HASH_MAP[algorithm]))
    return _der_to_raw(der_signature, private_key.curve.key_size)


def verify_raw(
    message: bytes,
    raw_signature: bytes,
    public_key_pem: str,
    algorithm: Literal["ES256", "ES384", "ES512"] = "ES256",
) -> bool:
    if algorithm not in _CURVE_MAP:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    public_key = load_pem_public_key(public_key_pem.encode("utf-8"))
    der_signature = _raw_to_der(raw_signature, public_key.curve.key_size)

    try:
        public_key.verify(der_signature, message, ec.ECDSA(_HASH_MAP[algorithm]))
        return True
    except Exception:
        return False


def raw_to_b64url(raw_sig: bytes) -> str:
    return base64.urlsafe_b64encode(raw_sig).rstrip(b"=").decode("utf-8")


def b64url_to_raw(value: str) -> bytes:
    padding = (-len(value)) % 4
    return base64.urlsafe_b64decode(value + ("=" * padding))