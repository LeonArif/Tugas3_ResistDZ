import base64
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "src"))

from crypto import jwt as jwt_lib
from crypto import ecdsa as ecdsa_utils


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def b64url_decode(data: str) -> bytes:
    padding = (-len(data)) % 4
    return base64.urlsafe_b64decode(data + ("=" * padding))


def decode_segment(segment: str):
    return json.loads(b64url_decode(segment).decode("utf-8"))


def build_token(header: dict, payload: dict, signature_b64: str) -> str:
    header_b64 = b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_b64 = b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    return f"{header_b64}.{payload_b64}.{signature_b64}"


@pytest.fixture()
def keypair_es256():
    return jwt_lib.generate_keypair("ES256")


@pytest.fixture()
def keypair_es384():
    return jwt_lib.generate_keypair("ES384")


class TestJwtSign:
    def test_sign_happy_path_es256(self, keypair_es256):
        # Happy Path: ES256 menghasilkan token valid yang dapat diverifikasi.
        payload = {"sub": "user-a", "role": "admin"}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")
        verified = jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"])

        assert verified["payload"] == payload
        assert verified["header"]["alg"] == "ES256"
        assert verified["header"]["typ"] == "JWT"

    def test_sign_happy_path_es384(self, keypair_es384):
        # Happy Path: ES384 sign/verify bekerja dengan keypair yang cocok.
        payload = {"sub": "user-b", "scope": ["read", "write"]}
        token = jwt_lib.sign(payload, keypair_es384["private_key"], "ES384")
        verified = jwt_lib.verify(token, keypair_es384["public_key"], algorithms=["ES384"])

        assert verified["payload"] == payload
        assert verified["header"]["alg"] == "ES384"

    def test_sign_overrides_header_alg_and_typ(self, keypair_es256):
        # Edge Case: override header dinormalisasi ke algoritma yang dipilih.
        payload = {"sub": "user-c"}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256", header={"alg": "none", "typ": "JWS"})
        header = decode_segment(token.split(".")[0])

        assert header["alg"] == "ES256"
        assert header["typ"] == "JWT"

    def test_sign_empty_payload(self, keypair_es256):
        # Edge Case: payload kosong tetap bisa ditandatangani dan diverifikasi.
        payload = {}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")
        verified = jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"])

        assert verified["payload"] == payload

    def test_sign_unsupported_algorithm(self, keypair_es256):
        # Edge Case: algoritma tidak didukung harus melempar error yang jelas.
        with pytest.raises(ValueError, match="Unsupported algorithm"):
            jwt_lib.sign({"sub": "user"}, keypair_es256["private_key"], "RS256")

    def test_sign_invalid_private_key(self):
        # Edge Case: private key tidak valid harus melempar error, bukan crash.
        with pytest.raises((ValueError, TypeError)):
            jwt_lib.sign({"sub": "user"}, "not-a-key", "ES256")

    def test_sign_unserializable_payload(self, keypair_es256):
        # Edge Case: payload tidak bisa di-serialize JSON harus melempar TypeError.
        with pytest.raises(TypeError):
            jwt_lib.sign({"bad": set([1, 2])}, keypair_es256["private_key"], "ES256")

    def test_sign_unserializable_header(self, keypair_es256):
        # Edge Case: header tidak bisa di-serialize JSON harus melempar TypeError.
        with pytest.raises(TypeError):
            jwt_lib.sign({"sub": "user"}, keypair_es256["private_key"], "ES256", header={"bad": set([1])})


class TestJwtVerify:
    def test_verify_happy_path(self, keypair_es256):
        # Happy Path: token valid terverifikasi dan mengembalikan payload/header/signature.
        payload = {"sub": "user-verify", "aud": "app"}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")
        verified = jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"])

        assert verified["payload"] == payload
        assert verified["header"]["alg"] == "ES256"
        assert verified["signature"] == token.split(".")[2]

    def test_verify_invalid_format(self, keypair_es256):
        # Edge Case: token dengan jumlah segmen salah harus invalid.
        with pytest.raises(ValueError, match="Token is invalid"):
            jwt_lib.verify("only.two", keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_invalid_header_base64(self, keypair_es256):
        # Edge Case: header bukan base64/JSON harus ditolak.
        token = "@@@." + token_payload_segment({"sub": "user"}) + ".sig"
        with pytest.raises(ValueError, match="Token is invalid"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_unsupported_algorithm(self, keypair_es256):
        # Edge Case: alg tidak didukung di header harus melempar error.
        token = build_token({"alg": "none", "typ": "JWT"}, {"sub": "user"}, "abc")
        with pytest.raises(ValueError, match="Unsupported algorithm"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_algorithm_not_allowed(self, keypair_es256):
        # Edge Case: alg di luar daftar allowed harus melempar error.
        payload = {"sub": "user"}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")
        with pytest.raises(ValueError, match="Algorithm not allowed"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES384"])

    def test_verify_tampered_payload(self, keypair_es256):
        # Edge Case: payload diubah harus gagal verifikasi signature.
        payload = {"sub": "user"}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")
        header_b64, payload_b64, signature_b64 = token.split(".")

        tampered_payload = {"sub": "hacker"}
        tampered_payload_b64 = b64url_encode(
            json.dumps(tampered_payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        tampered_token = f"{header_b64}.{tampered_payload_b64}.{signature_b64}"

        with pytest.raises(ValueError, match="Signature verification failed"):
            jwt_lib.verify(tampered_token, keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_tampered_signature(self, keypair_es256):
        # Edge Case: signature diubah harus gagal verifikasi.
        payload = {"sub": "user"}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")
        header_b64, payload_b64, signature_b64 = token.split(".")
        raw_sig = ecdsa_utils.b64url_to_raw(signature_b64)
        tampered_raw = bytearray(raw_sig)
        tampered_raw[0] ^= 0xFF
        tampered_sig = ecdsa_utils.raw_to_b64url(bytes(tampered_raw))
        tampered_token = f"{header_b64}.{payload_b64}.{tampered_sig}"

        with pytest.raises(ValueError, match="Signature verification failed"):
            jwt_lib.verify(tampered_token, keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_invalid_signature_encoding(self, keypair_es256):
        # Edge Case: signature bukan base64url harus memicu error verifikasi.
        payload = {"sub": "user"}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")
        header_b64, payload_b64, _ = token.split(".")
        tampered_token = f"{header_b64}.{payload_b64}.@@@"

        with pytest.raises(ValueError, match="Signature verification failed"):
            jwt_lib.verify(tampered_token, keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_expired_token(self, keypair_es256):
        # Edge Case: exp di masa lalu harus ditolak.
        now = datetime.now(timezone.utc)
        payload = {"sub": "user", "exp": int((now - timedelta(minutes=1)).timestamp())}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")

        with pytest.raises(ValueError, match="Token expired"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_not_before(self, keypair_es256):
        # Edge Case: nbf di masa depan harus ditolak.
        now = datetime.now(timezone.utc)
        payload = {"sub": "user", "nbf": int((now + timedelta(minutes=5)).timestamp())}
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")

        with pytest.raises(ValueError, match="Token not yet valid"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"])

    def test_verify_claim_mismatches(self, keypair_es256):
        # Edge Case: mismatch iss/sub/aud/jti harus ditolak.
        payload = {
            "iss": "issuer-a",
            "sub": "subject-a",
            "aud": "aud-a",
            "jti": "jti-a",
        }
        token = jwt_lib.sign(payload, keypair_es256["private_key"], "ES256")

        with pytest.raises(ValueError, match="Issuer mismatch"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"], options={"iss": "issuer-b"})

        with pytest.raises(ValueError, match="Subject mismatch"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"], options={"sub": "subject-b"})

        with pytest.raises(ValueError, match="Audience mismatch"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"], options={"aud": "aud-b"})

        with pytest.raises(ValueError, match="JWT ID mismatch"):
            jwt_lib.verify(token, keypair_es256["public_key"], algorithms=["ES256"], options={"jti": "jti-b"})


def token_payload_segment(payload: dict) -> str:
    return b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
