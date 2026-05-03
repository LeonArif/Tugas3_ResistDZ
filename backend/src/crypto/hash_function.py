import base64
import hashlib
import hmac
import os


DEFAULT_ITERATIONS = 200_000

def _b64_encode(raw: bytes) -> str:
	return base64.b64encode(raw).decode("utf-8")


def _b64_decode(encoded: str) -> bytes:
	return base64.b64decode(encoded.encode("utf-8"))


def generate_salt(length: int = 16) -> str:
	return _b64_encode(os.urandom(length))


def hash_str(password: str, salt_b64: str | None = None, iterations: int = DEFAULT_ITERATIONS) -> dict:
	if salt_b64 is None:
		salt_b64 = generate_salt()

	salt = _b64_decode(salt_b64)
	digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
	return {
		"salt": salt_b64,
		"hash": _b64_encode(digest),
		"iterations": iterations,
	}


def verify_hash(password: str, salt_b64: str, expected_hash_b64: str, iterations: int = DEFAULT_ITERATIONS) -> bool:
	salt = _b64_decode(salt_b64)
	expected = _b64_decode(expected_hash_b64)
	candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
	return hmac.compare_digest(candidate, expected)


def derive_key(password: str, salt_b64: str, length: int = 32, iterations: int = DEFAULT_ITERATIONS) -> bytes:
	salt = _b64_decode(salt_b64)
	return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=length)
