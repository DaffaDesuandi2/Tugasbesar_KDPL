# 📰 PosTera
### Portal Artikel Kampus Berbasis Web Aman (Microsoft SDL)

**PosTera** adalah aplikasi portal artikel kampus berbasis web yang dikembangkan menggunakan kerangka kerja **Microsoft Security Development Lifecycle (SDL)** dengan pemisahan hak akses **Admin** dan **Mahasiswa (User Biasa)**.

---

## 📌 Informasi Proyek

| Informasi | Keterangan |
|---|---|
| Nama Aplikasi | PosTera |
| Tema | Portal Artikel Kampus |
| Judul Proyek | Pengembangan Aplikasi Portal Artikel "PosTera" Berbasis Web Aman Menggunakan Kerangka Kerja Microsoft SDL |
| Platform | Web (React SPA + Express.js API + PostgreSQL) |
| Metodologi Keamanan | Microsoft Security Development Lifecycle (SDL) |

---

PosTera adalah aplikasi portal artikel kampus sederhana yang dirancang sebagai media publikasi dan penyebaran informasi di lingkungan kampus.

Aplikasi ini memiliki dua jenis pengguna utama, yaitu **Admin** dan **Mahasiswa (User Biasa)**.

Admin bertanggung jawab atas pengelolaan konten artikel, termasuk menambahkan, melihat, mengubah, dan menghapus artikel (CRUD). Selain itu, Admin memiliki kewenangan untuk menonaktifkan akun pengguna.

Mahasiswa dapat melakukan registrasi akun, login, membaca artikel, serta berinteraksi melalui komentar. Setiap mahasiswa hanya diperbolehkan menambahkan, mengubah, dan menghapus komentar miliknya sendiri.

Pengembangan PosTera menerapkan prinsip keamanan perangkat lunak berdasarkan Microsoft SDL untuk membantu mengidentifikasi, mencegah, dan mengurangi potensi kerentanan keamanan pada aplikasi.

## 🎯 Tujuan Pengembangan

1. Mengembangkan portal artikel kampus berbasis web.
2. Mengimplementasikan fitur CRUD pada konten artikel.
3. Menerapkan autentikasi dan otorisasi berdasarkan peran pengguna.
4. Memastikan pengguna hanya dapat memodifikasi data yang menjadi hak miliknya.
5. Menerapkan prinsip keamanan aplikasi berdasarkan Microsoft SDL.
6. Melakukan pengujian keamanan untuk mengidentifikasi potensi kerentanan aplikasi.

## ✨ Fitur Utama

### 👨‍💼 Admin
- Login ke sistem.
- Menambahkan artikel baru.
- Melihat daftar dan detail artikel.
- Mengubah artikel yang telah dipublikasikan.
- Menghapus artikel.
- Melihat daftar pengguna.
- Menonaktifkan akun pengguna.

### 🎓 Mahasiswa (User Biasa)
- Melakukan registrasi akun.
- Login dan logout.
- Membaca artikel yang tersedia.
- Menambahkan komentar pada artikel.
- Mengubah komentar milik sendiri.
- Menghapus komentar milik sendiri.

## 🔐 Keamanan Sistem

## 🔐 Kontrol Keamanan Microsoft SDL

| ID SR | Aspek Keamanan | Implementasi |
|---|---|---|
| `SR-AUTH-01` | Password Storage | Hashing kata sandi menggunakan `bcryptjs` (cost 12) |
| `SR-AUTH-02/03` | Authentication | Validasi kompleksitas password, pesan gagal login generik, rate limit 5x/menit (`HTTP 429`) |
| `SR-SESS-01` | Session Management | Regenerasi session ID saat login, invalidasi sesi di server saat logout |
| `SR-AUTHZ-01/02` | Authorization & IDOR | Middleware `requireAdmin` (*deny by default*) dan pemeriksaan kepemilikan komentar di server |
| `SR-INP-01` | Input Validation | Validasi server-side (judul artikel `3–150` karakter, ID integer positif -> `HTTP 422`) |
| `SR-INP-02` | Anti-SQL Injection | Seluruh kueri database menggunakan parameterized query (`$1..$n` via `pg`) |
| `SR-INP-03` | Anti-XSS | Auto-escaping React JSX untuk komentar & rendering aman Markdown |
| `SR-INP-04` | Proteksi CSRF | Middleware `verifyCsrfToken` pada seluruh metode mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) |
| `SR-CONF-01` | Secrets Management | Konfigurasi sensitif di `.env` dan dikecualikan lewat `.gitignore` |
| `SR-LOG-01` | Audit Logging | Pencatatan transaksi aksi `CREATE`, `UPDATE`, `DELETE` artikel dan `TOGGLE_USER_STATUS` ke tabel `audit_logs` |

## 🛡️ Penerapan Microsoft SDL

Pengembangan aplikasi mengacu pada tahapan Microsoft Security Development Lifecycle (SDL).

1. **Training:** Memahami prinsip dasar keamanan aplikasi web.
2. **Requirements:** Menentukan kebutuhan fungsional dan kebutuhan keamanan sistem.
3. **Design:** Merancang arsitektur sistem, kontrol akses, dan melakukan threat modeling.
4. **Implementation:** Mengembangkan aplikasi menggunakan praktik secure coding.
5. **Verification:** Melakukan pengujian fungsional dan keamanan.
6. **Release:** Memastikan persyaratan keamanan telah terpenuhi sebelum aplikasi digunakan.
7. **Response:** Menyiapkan prosedur penanganan apabila ditemukan kerentanan setelah rilis.

## 🛠️ Teknologi yang Digunakan

| Komponen | Teknologi |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Axios |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (`pg`) |
| Security & Testing | `bcryptjs`, `express-rate-limit`, `cookie-parser`, `node:test`, ESLint |

---

## 📂 Struktur Direktori Repositori

```text
Tugasbesar_KDPL/
├── backend/                     # Express.js API, middleware keamanan, migrasi, seeder, & tests
│   ├── controllers/             # Business logic (articleController.js)
│   ├── middleware/              # authorization.js, csrf.js, validation.js
│   ├── utils/                   # Helper audit log (auditLog.js)
│   ├── tests/                   # Automated unit & security integration tests
│   ├── adminRoutes.js           # Rute terproteksi Admin (/api/admin/*)
│   ├── articleRoutes.js         # Rute artikel publik & CRUD Admin (/articles, /api/articles)
│   ├── auth.js                  # Autentikasi, OTP, & manajemen sesi
│   ├── database.js              # Koneksi PostgreSQL & skema tabel
│   ├── migrate.js               # Skrip migrasi database
│   ├── seed.js                  # Skrip seeder akun Admin
│   └── server.js                # Entry point server Express
├── frontend/                    # Aplikasi React SPA (halaman publik & panel Admin)
│   └── src/                     # Komponen, halaman, context, dan konfigurasi Axios CSRF
├── docs/
│   ├── progress/                # Ringkasan progres mingguan & kontribusi anggota
│   ├── security/                # Security Requirements (SR) & Unsafe Function Analysis
│   ├── design/                  # Arsitektur, Trust Boundary, Attack Surface, & ERD
│   ├── testing/                 # Daftar Test Case keamanan (test-cases.md)
│   └── evidence/                # Bukti implementasi, SAST, dan hasil pengujian
├── .gitignore
└── README.md
```

---

## 🚀 Status Pengembangan

### 1. Backend (`backend/`)
```bash
cd backend
npm install
# Siapkan file .env (DATABASE_URL, PORT, EMAIL_USER, EMAIL_PASS)
npm run migrate
npm run seed
npm run dev
```

Menjalankan pengujian:
```bash
cd backend
npm run test:articles:unit   # Unit & mock-DB security test (TC-06 s.d. TC-10)
npm run test:authorization   # Unit test middleware RBAC
npm test                     # Seluruh suite test (memerlukan PostgreSQL aktif)
```

### 2. Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```

Build produksi & lint:
```bash
cd frontend
npm run lint
npm run build
```

---

## 👥 Anggota Kelompok

| No. | Nama Anggota | NIM | Peran |
|---|---|---|---|
| 1 | Muhammad Daffansyah Desuandi | 123140127 | Security Lead |
| 2 | Ragil Bayu Saputra | 123140128 | Frontend Developer |
| 3 | Arsa Salsabila | 123140108 | QA / Security Tester |
| 4 | Grace Exauditha Nababan | 123140115 | Integration & DevOps |
| 5 | Andre Prasetya Daely | 123140131 | Lead Developer (Backend) |
