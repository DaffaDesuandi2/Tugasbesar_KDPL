# Bukti Implementasi & Pengujian — Modul CRUD Artikel Admin & Audit Log

Dokumen ini merangkum bukti implementasi kode, hasil analisis SAST (*Unsafe Function Analysis*), serta hasil verifikasi pengujian untuk modul CRUD Artikel Admin dan pencatatan `audit_logs`.

## 1. Artefak Kode (`backend/` & `frontend/`)

* `backend/controllers/articleController.js` — Controller CRUD artikel Admin (`createArticle`, `updateArticle`, `deleteArticle`, `listAdminArticles`, `getAdminArticleById`) dan rute publik (`listPublicArticles`, `getPublicArticleById`).
* `backend/articleRoutes.js` — Pemetaan endpoint publik (`GET /`, `GET /:id`) dan Admin (`POST /`, `PUT /:id`, `PATCH /:id`, `DELETE /:id`) dengan `authenticateUser` + `requireAdmin`.
* `backend/adminRoutes.js` — Endpoint `/api/admin/articles/*` dan `GET /api/admin/audit-logs`.
* `backend/middleware/validation.js` — Validasi ID integer positif (`validateArticleIdParam`) serta panjang judul 3–150 karakter (`validateCreateArticleInput`, `validatePatchArticleInput`).
* `backend/utils/auditLog.js` — Pencatatan transaksional ke tabel `audit_logs` (`recordAuditLog`).
* `backend/server.js` — Pemasangan `verifyCsrfToken` global serta mount `/api/articles` dan `/articles`.
* `frontend/src/pages/AdminArticlesPage.jsx`, `AdminArticleCreatePage.jsx`, `AdminArticleEditPage.jsx`, `AdminAuditLogsPage.jsx` — Terhubung ke endpoint API backend melalui Axios interceptor CSRF.

## 2. Hasil Unsafe Function Analysis (Sisi SQL & Fungsi Berbahaya)

* Total berkas dipindai di `src/`: **45 berkas** (`.js` & `.jsx`).
* Temuan kueri SQL non-parameterized / penggabungan string input pengguna: **0 temuan**.
* Temuan `eval`, `new Function`, `dangerouslySetInnerHTML`, `innerHTML`, `child_process`: **0 temuan**.
* Rincian tabel analisis per baris tersedia di [unsafe-function-analysis.md](file:///d:/G/sem7/KDPL/Tugasbesar_KDPL/docs/security/unsafe-function-analysis.md).

## 3. Daftar Test Case Modul CRUD Artikel & Anti-SQL Injection (TC-06 s.d. TC-10)

| ID | Skenario | File Pengujian |
| :--- | :--- | :--- |
| **TC-06** | Admin membuat, mengedit (`PUT`/`PATCH`), dan menghapus (`DELETE`) artikel valid | `backend/tests/articles.unit.test.js` & `backend/tests/articles.test.js` |
| **TC-07** | Batas panjang judul (kosong, `< 3`, `> 150` karakter) ditolak HTTP `422` | `backend/tests/articles.unit.test.js` & `backend/tests/articles.test.js` |
| **TC-08** | User Biasa (`mahasiswa`) ditolak HTTP `403` saat akses CRUD artikel & tanpa CSRF ditolak `403` | `backend/tests/articles.unit.test.js` & `backend/tests/articles.test.js` |
| **TC-09** | Pencarian artikel dengan payload `' OR 1=1 --` aman (parameterized query) & ID SQLi ditolak `422` | `backend/tests/articles.unit.test.js` & `backend/tests/articles.test.js` |
| **TC-10** | Aksi CRUD artikel (`CREATE`, `UPDATE`, `DELETE`) tercatat di tabel `audit_logs` | `backend/tests/articles.unit.test.js` & `backend/tests/articles.test.js` |
