import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from crypto import aes

# Generate kunci AES-256 (32 bytes)
key = aes.generate_key(32)
plaintext_asli = "Ini Pesan antara ResistDZ dan ChaDZapp!"

print("=== Dekripsi dengan Kunci yang Sesuai ===")
print(f"Plaintext asli : {plaintext_asli}")
print(f"AES Key (hex)  : {key.hex()}")

# Enkripsi
hasil_enkripsi = aes.encrypt_text(plaintext_asli, key)
print(f"\nHasil Enkripsi :")
print(f"  Ciphertext : {hasil_enkripsi['ciphertext']}")
print(f"  Nonce      : {hasil_enkripsi['nonce']}")
print(f"  Mode       : {hasil_enkripsi['mode']}")

# Dekripsi dengan kunci yang sama
hasil_dekripsi = aes.decrypt_text(
    hasil_enkripsi["ciphertext"],
    hasil_enkripsi["nonce"],
    key
)

print(f"\nHasil Dekripsi : {hasil_dekripsi}")

if hasil_dekripsi == plaintext_asli:
    print("\n[PASSED] Pesan berhasil didekripsi dengan benar.")
else:
    print("\n[FAILED] Pesan tidak sesuai!")