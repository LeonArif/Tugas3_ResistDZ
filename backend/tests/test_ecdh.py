import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))
from crypto import ecdh

# Masing-masing generate keypair
alice = ecdh.generate_keypair()
bob   = ecdh.generate_keypair()

print("=== Keypair Alice ===")
print(f"Public Key  : {alice['public_key']}")
print(f"Private Key : {alice['private_key'][:10]}... ")

print("\n=== Keypair Bob ===")
print(f"Public Key  : {bob['public_key']}")
print(f"Private Key : {bob['private_key'][:10]}... ")

# Key exchange: masing-masing derive shared secret dari public key lawan
secret_alice = ecdh.derive_shared_secret(alice["private_key"], bob["public_key"])
secret_bob   = ecdh.derive_shared_secret(bob["private_key"], alice["public_key"])

print("\n=== Hasil Key Exchange ===")
print(f"Shared Secret (Alice) : {secret_alice.hex()}")
print(f"Shared Secret (Bob)   : {secret_bob.hex()}")

if secret_alice == secret_bob:
    print("\n[PASSED] Shared secret IDENTIK di kedua sisi.")
else:
    print("\n[FAILED] Shared secret BERBEDA!")