# Arsitektur Sistem, Trust Boundary, Attack Surface, & Perancangan Database (ERD)

## 1. Arsitektur Sistem (Komponen & Konektor — Garlan & Shaw)

1. **Client Tier (`frontend/`)**: Aplikasi SPA berbasis React + Vite + Tailwind CSS. Mengirim permintaan melalui Axios (`frontend/src/api/axios.js`) dengan `withCredentials: true` dan penyertaan otomatis header `x-csrf-token` untuk setiap metode mutasi.
2. **Application Tier (`backend/`)**: Server Express.js (`server.js`) yang menerapkan pipeline kontrol keamanan:
   * CORS (`ALLOWED_ORIGINS`) & Cookie Parser
   * Proteksi CSRF global (`verifyCsrfToken`)
   * Autentikasi sesi (`authenticateUser`) & Otorisasi RBAC *deny by default* (`requireAdmin`)
   * Validasi input server-side (`validation.js`)
   * Pencatatan audit log (`utils/auditLog.js`)
3. **Data Tier (PostgreSQL)**: Penyimpanan relasional dengan constraint integritas data (`PK`, `FK`, `UNIQUE`, `CHECK`) diinisialisasi melalui `backend/database.js` dan `backend/migrate.js`.

### Trust Boundaries
* **Trust Boundary 1 (Pengguna – Aplikasi Web)**: Memisahkan browser pengguna dan server Express.js. Dikontrol oleh CORS, validasi input, CSRF token, cookie `HttpOnly`, serta middleware `authenticateUser` dan `requireAdmin`.
* **Trust Boundary 2 (Aplikasi Web – Database)**: Memisahkan server Express.js dan PostgreSQL. Dikontrol oleh parameterized queries (`$1..$n`), transaksi atomik (`BEGIN`/`COMMIT`), hashing password `bcrypt`, serta isolasi `DATABASE_URL` dalam `.env`.

---

## 2. Attack Surface — Modul Artikel & Audit Log

| Endpoint | Method | Hak Akses | Kontrol Keamanan |
| :--- | :--- | :--- | :--- |
| `/articles`, `/api/articles` | `GET` | Publik | Filter hanya `status = 'published'`, parameterized query, batas paginasi (`1–100`) |
| `/articles/:id`, `/api/articles/:id` | `GET` | Publik | Validasi `:id` integer positif (`422`), filter hanya `published` (`404` jika arsip), parameterized query |
| `/api/articles` | `POST` | Admin | `authenticateUser` + `requireAdmin` (deny by default), `verifyCsrfToken`, validasi judul 3–150 karakter, transaksi + `audit_logs` (`CREATE`) |
| `/api/articles/:id` | `PUT`, `PATCH` | Admin | `authenticateUser` + `requireAdmin`, `verifyCsrfToken`, validasi `:id` & payload, transaksi + `audit_logs` (`UPDATE`) |
| `/api/articles/:id` | `DELETE` | Admin | `authenticateUser` + `requireAdmin`, `verifyCsrfToken`, validasi `:id`, transaksi + `audit_logs` (`DELETE`) |
| `/api/admin/articles`, `/api/admin/articles/:id` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Admin | Terproteksi `adminRouter.use(authenticateUser, requireAdmin)` + `verifyCsrfToken` |
| `/api/admin/audit-logs` | `GET` | Admin | Terproteksi `adminRouter.use(authenticateUser, requireAdmin)`, read-only, parameterized filters |

---

## 3. Spesifikasi Tabel Database (ERD)

Skema didefinisikan pada `backend/database.js`:

1. **`users`**: `id (PK)`, `name (VARCHAR 100)`, `email (UNIQUE, CHECK @student.itera.ac.id untuk mahasiswa)`, `password_hash`, `role ('admin' | 'mahasiswa')`, `is_active`, `failed_login_attempts (>= 0)`, `created_at`, `updated_at`.
2. **`sessions`**: `id (PK)`, `session_id (UNIQUE, VARCHAR 64)`, `user_id (FK -> users.id ON DELETE CASCADE)`, `ip_address`, `user_agent`, `expires_at`, `created_at`.
3. **`articles`**: `id (PK)`, `user_id (FK -> users.id ON DELETE CASCADE)`, `title (VARCHAR 150, CHECK LENGTH(TRIM(title)) >= 3)`, `description (TEXT)`, `image_url (TEXT NOT NULL)`, `category (VARCHAR 50, DEFAULT 'umum')`, `status (CHECK IN ('published', 'archived', 'rejected'))`, `created_at`, `updated_at`.
4. **`article_comments`**: `id (PK)`, `user_id (FK -> users.id ON DELETE CASCADE)`, `article_id (FK -> articles.id ON DELETE CASCADE)`, `content (CHECK LENGTH(TRIM(content)) > 0)`, `created_at`, `updated_at`.
5. **`audit_logs`**: `id (PK)`, `user_id (FK -> users.id ON DELETE SET NULL)`, `action (VARCHAR 50)`, `entity_type (VARCHAR 50)`, `entity_id (INT)`, `details (TEXT)`, `ip_address (VARCHAR 45)`, `created_at`.
6. **`otps`**: `id (PK)`, `email`, `otp_code`, `expires_at`, `attempts`, `created_at`.
