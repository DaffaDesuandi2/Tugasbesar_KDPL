# 🔐 PosTera Backend (FastAPI + Microsoft SDL)

Modul backend untuk aplikasi portal artikel kampus **PosTera**, dibangun dengan fokus keamanan perangkat lunak sesuai kerangka kerja **Microsoft Security Development Lifecycle (SDL)** dan **OWASP Top 10**.

---

## 🛡️ Fitur Keamanan yang Diimplementasikan

| Fitur | Kategori SDL / OWASP | Deskripsi & Mitigasi |
|---|---|---|
| **Password Hashing (bcrypt)** | Password Storage | Menggunakan algoritma `bcrypt` dengan salt otomatis (cost factor 12) untuk mencegah cracking dan kebocoran hash. |
| **Validasi Kompleksitas Password** | Input Validation | Memastikan password minimal 8 karakter dengan kombinasi huruf kapital, huruf kecil, dan angka. |
| **Regenerasi ID Sesi** | Session Fixation Mitigation | Setiap kali pengguna berhasil login, sesi lama dimusnahkan dan `Session ID` baru yang acak (CSPRNG) diterbitkan. |
| **Rate Limiting Login** | Brute-force Mitigation | Pembatasan maksimal 5 percobaan login per menit per alamat IP menggunakan `slowapi`. Request ke-6 akan memicu HTTP 429 Too Many Requests. |
| **HTTP-Only Session Cookie** | Cross-Site Scripting (XSS) Mitigation | Sesi disimpan dalam cookie berflag `HttpOnly` dan `SameSite=Lax` sehingga terlindungi dari pencurian sesi via JavaScript injeksi. |
| **Pencegahan User Enumeration** | Information Disclosure | Pesan kegagalan login dibuat generik: *"Email atau kata sandi tidak valid."* tanpa membedakan apakah email atau password yang salah. |
| **Account Management & Access Control** | Authorization | Admin dapat menonaktifkan akun (`is_active = False`), dan sesi pengguna terkait langsung dibatalkan secara server-side. |

---

## 📂 Struktur Direktori

```text
backend/
├── alembic/              # Konfigurasi & skrip migrasi database
│   └── versions/         # Skrip versi migrasi (tabel users & sessions)
├── app/
│   ├── api/
│   │   ├── deps.py       # Dependency autentikasi & otorisasi role
│   │   └── routes/
│   │       └── auth.py   # Endpoint register, login, logout, me
│   ├── core/
│   │   ├── config.py     # Konfigurasi aplikasi & CORS
│   │   ├── limiter.py    # Rate limiter setup
│   │   └── security.py   # Bcrypt hash & secure token generator
│   ├── db/
│   │   ├── base.py       # Declarative Base SQLAlchemy
│   │   └── session.py    # Database connection & session factory
│   ├── models/
│   │   ├── user.py       # Model tabel users (Role: admin, mahasiswa)
│   │   └── session.py    # Model tabel sessions (Anti-Session Fixation)
│   ├── schemas/
│   │   └── user.py       # Pydantic schemas (validasi request/response)
│   └── main.py           # Entry point FastAPI & CORS
├── tests/
│   └── test_auth_security.py # Unit test fitur keamanan
├── alembic.ini
├── requirements.txt
└── .env.example
```

---

## 🚀 Cara Menjalankan Backend

1. **Aktifkan Virtual Environment:**
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   ```

2. **Jalankan Migrasi Database:**
   ```powershell
   alembic upgrade head
   ```

3. **Jalankan Server Backend:**
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

4. **Buka Dokumentasi Interaktif (Swagger UI):**
   Kunjungi browser di: `http://localhost:8000/docs`
