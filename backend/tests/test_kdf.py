import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))
from crypto import ecdh

# Generate shared secret 
alice = ecdh.generate_keypair()
bob   = ecdh.generate_keypair()
shared_secret = ecdh.derive_shared_secret(alice["private_key"], bob["public_key"])

print("=== Pengujian KDF (HKDF-SHA256) ===")

# Test 1: Salt yang sama sehingga AES key harus identik
result_alice = ecdh.derive_aes_key(shared_secret) # generate salt
result_bob   = ecdh.derive_aes_key(shared_secret, result_alice["salt"]) # pakai salt yang sama

print(f"\n[Test 1] Salt sama sehingga AES key harus identik")
print(f"Salt       : {result_alice['salt']}")
print(f"AES Key A  : {result_alice['key'].hex()}")
print(f"AES Key B  : {result_bob['key'].hex()}")

if result_alice["key"] == result_bob["key"]:
    print("[PASSED] AES key identik dengan salt yang sama.")
else:
    print("[FAILED] AES key berbeda padahal salt sama")

# Test 2: Salt berbeda sehingga AES key harus berbeda
result_different = ecdh.derive_aes_key(shared_secret) # salt baru

print(f"\n[Test 2] Salt berbeda sehingga AES key harus berbeda")
print(f"Salt lama  : {result_alice['salt']}")
print(f"Salt baru  : {result_different['salt']}")
print(f"AES Key 1  : {result_alice['key'].hex()}")
print(f"AES Key 2  : {result_different['key'].hex()}")

if result_alice["key"] != result_different["key"]:
    print("[PASSED] AES key berbeda dengan salt yang berbeda.")
else:
    print("[FAILED] AES key tetap sama padahal salt berbeda")

# Test 3: Shared secret berbeda sehingga AES key harus berbeda 
charlie       = ecdh.generate_keypair()
wrong_secret  = ecdh.derive_shared_secret(alice["private_key"], charlie["public_key"])
result_wrong  = ecdh.derive_aes_key(wrong_secret, result_alice["salt"])

print(f"\n[Test 3] Shared secret berbeda sehingga AES key harus berbeda")
print(f"AES Key (benar) : {result_alice['key'].hex()}")
print(f"AES Key (salah) : {result_wrong['key'].hex()}")

if result_alice["key"] != result_wrong["key"]:
    print("[PASSED] AES key berbeda untuk shared secret yang berbeda.")
else:
    print("[FAILED] AES key sama padahal shared secret berbeda")