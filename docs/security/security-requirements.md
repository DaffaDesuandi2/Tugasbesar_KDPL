# Security Requirements (SR) & Pemetaan Kontrol PosTera

Dokumen ini memetakan **Security Requirements V1** berdasarkan kerangka kerja Microsoft SDL ke implementasi nyata di direktori `src/`.

| ID | Kebutuhan Keamanan | Ancaman Dicegah | Implementasi di `src/` | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SR-AUTH-01** | Password seluruh akun disimpan sebagai hash `bcrypt` | Pencurian kredensial database | `hashPassword` & `verifyPassword` (`bcryptjs`, salt 12) di `backend/security.js`; proyeksi query mengecualikan `password_hash` | Terimplementasi |
| **SR-AUTH-02** | Registrasi menolak password `< 8` karakter; pesan gagal login dibuat generik | Password lemah, enumerasi akun | `validatePasswordStrength` di `backend/security.js` & `auth.js` (`'Email atau kata sandi tidak valid.'`) | Terimplementasi |
| **SR-AUTH-03** | Pembatasan percobaan login maksimal 5 kali per menit | Brute force | `loginLimiter` (`express-rate-limit`) di `backend/security.js` | Terimplementasi |
| **SR-SESS-01** | Regenerasi ID sesi saat login dan penghapusan sesi saat logout | Session fixation, session replay | `generateSessionId`, penghapusan sesi lama, dan `POST /api/auth/logout` di `backend/auth.js` | Terimplementasi |
| **SR-AUTHZ-01** | Rute Admin hanya dapat diakses Admin, ditegakkan middleware server (*deny by default*) | Eskalasi hak akses, broken access control | `requireAdmin` di `backend/middleware/authorization.js`, terpasang pada `adminRouter` dan seluruh endpoint mutasi artikel di `articleRoutes.js` | Terimplementasi |
| **SR-AUTHZ-02** | User biasa hanya boleh mengubah/menghapus komentar miliknya sendiri | BOLA / IDOR | Pemeriksaan `checkRes.rows[0].user_id !== req.user.id && req.user.role !== 'admin'` di `backend/articleRoutes.js` | Terimplementasi |
| **SR-INP-01** | Validasi server tipe, panjang, format (judul artikel 3–150 karakter, ID integer positif) | Input tidak valid, parameter tampering | `validateCreateArticleInput`, `validatePatchArticleInput`, `validateArticleIdParam` di `backend/middleware/validation.js` (HTTP `422`) | Terimplementasi |
| **SR-INP-02** | Seluruh kueri database menggunakan parameterized query / ORM | SQL Injection | Seluruh query `pool.query` / `client.query` memakai `$1..$n` (diverifikasi di `unsafe-function-analysis.md`) | Terimplementasi |
| **SR-INP-03** | Output komentar dan artikel Markdown tidak mengeksekusi HTML/JS mentah | Stored XSS | Auto-escaping React JSX pada `ArticleDetailPage.jsx`, `AdminArticleCreatePage.jsx`, `AdminArticleEditPage.jsx` | Terimplementasi |
| **SR-INP-04** | Setiap request mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) mewajibkan token CSRF valid | Cross-Site Request Forgery (CSRF) | `verifyCsrfToken` global di `backend/server.js` & `backend/middleware/csrf.js`; interceptor di `frontend/src/api/axios.js` | Terimplementasi |
| **SR-CONF-01** | Rahasia/kredensial disimpan di `.env` dan dikecualikan lewat `.gitignore` | Kebocoran kredensial | `.gitignore` di root dan `backend/.gitignore` mengecualikan `.env` | Terimplementasi |
| **SR-LOG-01** | Audit log mencatat login/toggle user dan aksi CRUD artikel oleh Admin tanpa membocorkan token/password | Repudiation, kebocoran kredensial | Tabel `audit_logs` + helper `recordAuditLog` di `backend/utils/auditLog.js` pada `CREATE`, `UPDATE`, `DELETE` artikel & `TOGGLE_USER_STATUS` | Terimplementasi |
| **SR-DEP-01** | Audit dependensi dan pemeliharaan paket | Komponen rentan (*vulnerable components*) | Daftar dependensi di `backend/package.json` dan `frontend/package.json` | Berjalan |
