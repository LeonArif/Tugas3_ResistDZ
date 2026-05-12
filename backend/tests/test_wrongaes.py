import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from crypto import aes
from cryptography.exceptions import InvalidTag

# Generate dua kunci berbeda
key_benar = aes.generate_key(32)
key_salah = aes.generate_key(32)  # kunci berbeda
plaintext_asli = "Ini Pesan antara ResistDZ dan ChaDZapp!"

print("=== Dekripsi dengan Kunci yang Salah ===")
print(f"Key Benar (hex) : {key_benar.hex()}")
print(f"Key Salah (hex) : {key_salah.hex()}")

# Enkripsi dengan kunci benar
hasil_enkripsi = aes.encrypt_text(plaintext_asli, key_benar)
print(f"\nCiphertext : {hasil_enkripsi['ciphertext']}")
print(f"Nonce      : {hasil_enkripsi['nonce']}")

# Dekripsi dengan kunci salah
print("\nDekripsi...")
try:
    hasil_dekripsi = aes.decrypt_text(
        hasil_enkripsi["ciphertext"],
        hasil_enkripsi["nonce"],
        key_salah
    )
    print(f"[FAILED] Seharusnya gagal, tapi menghasilkan: {hasil_dekripsi}")
except InvalidTag:
    print("[PASSED] Dekripsi ditolak: InvalidTag - autentikasi GCM gagal.")
except Exception as e:
    print(f"[PASSED] Dekripsi ditolak dengan error: {type(e).__name__}: {e}")