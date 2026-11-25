# Ringkasan Progres Pengembangan PosTera (Microsoft SDL)

## Identitas Tim & Pembagian Peran

| Anggota | NIM | Peran | Modul & Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| Andre Prasetya Daely | 123140131 | Lead Developer (Backend) | Autentikasi (registrasi, login, logout, hashing, sesi, rate limit), struktur proyek, arsitektur |
| Ragil Bayu Saputra | 123140128 | Frontend Developer | Modul komentar (UI & alur user), tampilan artikel, dashboard Admin, validasi input klien |
| Muhammad Daffansyah Desuandi | 123140127 | Security Lead | Middleware role/otorisasi, audit log, header keamanan, SR, STRIDE, code review, SAST |
| Arsa Salsabila | 123140108 | QA / Security Tester | Manajemen pengguna Admin, test plan, test case, test log, retest |
| Grace Exauditha Nababan | 123140115 | Integration & DevOps | CRUD artikel Admin, konfigurasi database, seeder Admin, ERD, deployment, README |

---

## Ringkasan Pencapaian Implementasi (Progress 1–3)

1. **Database & Seeder**: Skema PostgreSQL (`users`, `sessions`, `articles`, `article_comments`, `audit_logs`, `otps`) beserta skrip migrasi (`backend/migrate.js`) dan seeder Admin idempoten (`backend/seed.js`).
2. **Autentikasi & Otorisasi**: Login/logout/registrasi OTP, hashing `bcrypt`, rate limiting, regenerasi session ID, serta middleware `requireAdmin` (*deny by default*).
3. **CRUD Artikel Admin, Rute Publik, & Audit Log**:
   * Endpoint publik `GET /articles`, `GET /articles/:id` (dan `/api/articles`) dengan filter kategori, pencarian aman anti-SQLi, dan paginasi.
   * Endpoint Admin `POST /api/articles`, `PUT/PATCH /api/articles/:id`, `DELETE /api/articles/:id`, serta `/api/admin/articles` dan `/api/admin/audit-logs`.
   * Validasi server-side panjang judul `3–150` karakter, proteksi CSRF (`verifyCsrfToken`), dan pencatatan transaksi ke `audit_logs` (`CREATE`, `UPDATE`, `DELETE`).
   * Integrasi penuh antarmuka Admin (`AdminArticlesPage`, `AdminArticleCreatePage`, `AdminArticleEditPage`, `AdminAuditLogsPage`) dengan API backend.
4. **Artefak SDL & Pengujian**:
   * Penataan struktur folder `backend/`, `frontend/`, dan `docs/` (`progress`, `security`, `design`, `testing`, `evidence`).
   * Dokumen Unsafe Function Analysis khusus sisi SQL (`docs/security/unsafe-function-analysis.md`).
   * Penyusunan dan pengujian **TC-06 s.d. TC-10** untuk modul CRUD Artikel & Anti-SQL Injection (`docs/testing/test-cases.md`, `backend/tests/articles.unit.test.js`, `backend/tests/articles.test.js`).
