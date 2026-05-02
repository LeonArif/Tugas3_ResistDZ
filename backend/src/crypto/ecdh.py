import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat, PublicFormat


def _b64_encode(raw: bytes) -> str:
	return base64.b64encode(raw).decode("utf-8")


def _b64_decode(encoded: str) -> bytes:
	return base64.b64decode(encoded.encode("utf-8"))


def generate_keypair() -> dict:
	private_key = X25519PrivateKey.generate()
	public_key = private_key.public_key()

	private_raw = private_key.private_bytes(
		encoding=Encoding.Raw,
		format=PrivateFormat.Raw,
		encryption_algorithm=NoEncryption(),
	)
	public_raw = public_key.public_bytes(
		encoding=Encoding.Raw,
		format=PublicFormat.Raw,
	)

	return {
		"private_key": _b64_encode(private_raw),
		"public_key": _b64_encode(public_raw),
	}


def derive_shared_secret(my_private_key_b64: str, peer_public_key_b64: str) -> bytes:
	my_private = X25519PrivateKey.from_private_bytes(_b64_decode(my_private_key_b64))
	peer_public = X25519PublicKey.from_public_bytes(_b64_decode(peer_public_key_b64))
	return my_private.exchange(peer_public)


def derive_aes_key(shared_secret: bytes, salt_b64: str | None = None, info: bytes = b"chat-aes-key") -> dict:
	if salt_b64 is None:
		salt = os.urandom(16)
		salt_b64 = _b64_encode(salt)
	else:
		salt = _b64_decode(salt_b64)

	hkdf = HKDF(
		algorithm=hashes.SHA256(),
		length=32,
		salt=salt,
		info=info,
	)
	key = hkdf.derive(shared_secret)

	return {
		"salt": salt_b64,
		"key": key,
	}
