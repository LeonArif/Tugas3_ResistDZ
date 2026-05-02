import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _b64_encode(raw: bytes) -> str:
	return base64.b64encode(raw).decode("utf-8")


def _b64_decode(encoded: str) -> bytes:
	return base64.b64decode(encoded.encode("utf-8"))


def generate_key(length: int = 32) -> bytes:
	if length not in (16, 24, 32):
		raise ValueError("AES key length must be 16, 24, or 32 bytes")
	return os.urandom(length)


def encrypt_bytes(plaintext: bytes, key: bytes, aad: bytes | None = None) -> dict:
	nonce = os.urandom(12)
	aesgcm = AESGCM(key)
	ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
	return {
		"ciphertext": _b64_encode(ciphertext),
		"nonce": _b64_encode(nonce),
		"mode": "AES-256-GCM" if len(key) == 32 else "AES-GCM",
	}


def decrypt_bytes(ciphertext_b64: str, nonce_b64: str, key: bytes, aad: bytes | None = None) -> bytes:
	aesgcm = AESGCM(key)
	ciphertext = _b64_decode(ciphertext_b64)
	nonce = _b64_decode(nonce_b64)
	return aesgcm.decrypt(nonce, ciphertext, aad)


def encrypt_text(plaintext: str, key: bytes, aad: bytes | None = None) -> dict:
	return encrypt_bytes(plaintext.encode("utf-8"), key, aad)


def decrypt_text(ciphertext_b64: str, nonce_b64: str, key: bytes, aad: bytes | None = None) -> str:
	plaintext = decrypt_bytes(ciphertext_b64, nonce_b64, key, aad)
	return plaintext.decode("utf-8")
