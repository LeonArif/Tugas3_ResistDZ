# Pembuatan Aplikasi Chat Web dengan Kriptografi Kunci-Simetri dan Kunci-Publik (Tugas 3 II4021 Kriptografi)

Aplikasi chat berbasis web yang menggabungkan autentikasi, pembentukan kunci komunikasi, dan enkripsi pesan dalam satu alur.

## ── .✦ Deskripsi program
ChaDZapp adalah aplikasi chat web dengan fokus keamanan komunikasi. Mekanisme utama yang digunakan:
- Autentikasi pengguna menggunakan JWT.
- Pembentukan shared secret menggunakan ECDH dan HKDF.
- Enkripsi dan dekripsi pesan menggunakan AES-256.

Server berperan sebagai perantara data tanpa menyimpan kunci komunikasi maupun mengetahui isi pesan.

## ── .✦ Tech Stack
| Area | Teknologi |
| --- | --- |
| Backend | Python 3.11, FastAPI, Uvicorn, SQLAlchemy, Pydantic |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Kriptografi | ECDH, HKDF, AES-256, JWT |
| Tools | Docker, Docker Compose, Pytest, ESLint |

## ── .✦ Dependensi

### Backend (Python)

| Package | Versi | Keterangan |
|---|---|---|
| fastapi | 0.104.1 | Framework API backend |
| uvicorn | 0.24.0 | ASGI server untuk menjalankan FastAPI |
| sqlalchemy | 2.0.23 | ORM database |
| pydantic | 2.5.0 | Validasi data dan schema |
| cryptography | 41.0.7 | Enkripsi dan keamanan data |
| bcrypt | 4.1.1 | Hashing password |
| python-dotenv | 1.0.0 | Manajemen environment variable |
| pyjwt | 2.12.1 | JWT authentication |
| email-validator | 2.1.0.post1 | Validasi format email |
| pytest | 7.4.3 | Framework pengujian/testing |

### Frontend (Node)

| Package | Versi | Keterangan |
|---|---|---|
| react | Latest | Library UI frontend |
| react-dom | Latest | Rendering React ke DOM |
| vite | Latest | Build tool frontend |
| typescript | Latest | Superset JavaScript dengan type safety |
| tailwindcss | Latest | Utility-first CSS framework |
| eslint | Latest | Linter untuk menjaga kualitas kode |

## ── .✦ Tata cara menjalankan program
### Opsi A - Docker Compose
1. Pastikan Docker Desktop aktif.
2. Jalankan:

```powershell
docker compose up --build
```

3. Akses aplikasi:
	- Frontend: http://localhost:5173
	- Backend API: http://localhost:8000

### Opsi B - Menjalankan manual (tanpa Docker)
#### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

#### Frontend
```powershell
cd frontend
npm install
npm run dev
```

#### Pengujian backend (opsional)
```powershell
cd backend
pytest
```

## ── .✦ Environment/configuration yang digunakan
Variabel lingkungan yang didukung:
- `DATABASE_URL` (default: `sqlite:///./chat.db`)
- `VITE_API_PROXY_TARGET` (default: `http://localhost:8000`)

Konfigurasi dibaca saat runtime. Pada Docker Compose, tiap service menggunakan konfigurasi lingkungan terpisah agar backend dan frontend dapat diatur secara independen.

## ── .✦ Pembahasan spesifik untuk Docker
### Struktur container
- backend: menjalankan FastAPI dengan Uvicorn.
- frontend: menjalankan server pengembangan Vite.
- backend-tests: menjalankan Pytest untuk pengujian backend.

### Pemisahan service
- Backend dan frontend dipisah agar pengembangan UI tidak mengganggu API.
- Service pengujian disediakan terpisah untuk menjalankan test secara konsisten.

### Strategi konfigurasi
- Port mapping: 8000 untuk backend dan 5173 untuk frontend.
- Volume data backend dipetakan agar data SQLite persisten.
- Kebijakan restart digunakan untuk menjaga layanan backend tetap aktif.

## ── .✦ Pembagian tugas
| Anggota | Tugas |
| --- | --- |
| Leonard Arif Sutiono (18223120) | Implementasi registrasi dan login pengguna.<br>Implementasi hashing password dan autentikasi.<br>Pembuatan library JWT (sign dan verify).<br>Implementasi validasi token dan pengujian JWT. |
| Khairunnisa Azizah (18223117) | Implementasi ECDH, HKDF, dan shared secret.<br>Implementasi enkripsi/dekripsi AES-256 dan pengiriman pesan.<br>Implementasi daftar kontak dan penyimpanan pesan.<br>Pengujian fitur komunikasi dan kriptografi. |
| Nakeisha Valya Shakila (18223133) | Implementasi frontend dan integrasi dengan backend.<br>Implementasi bonus MAC/HMAC dan unit test JWT.<br>Implementasi Docker dan integrasi pada system.<br>Penyusunan README, video demo, dan integrasi laporan. |
