# Unsafe Function Analysis — Fokus Pola Kueri Database & Eksekusi Berbahaya (`src/`)

Dokumen ini mencatat hasil **Static Application Security Testing (SAST) / Unsafe Function Analysis** pada seluruh berkas sumber di dalam direktori `src/` (`backend/` dan `frontend/src/`, total **45 berkas** `.js`/`.jsx`, di luar `node_modules/`, `dist/`, dan `.vite/`), dengan fokus utama pada pencarian pola kueri database berbahaya (raw SQL dengan penggabungan string/interpolasi input pengguna) serta fungsi berbahaya pada JavaScript/React (**SR-INP-02** & **SR-INP-03**).

---

## 1. Metodologi Pemindaian

Pola yang dipindai di seluruh `src/`:
1. **Pola Kueri SQL Berbahaya (CWE-89 / SR-INP-02)**:
   * Seluruh pemanggilan `pool.query(...)`, `client.query(...)`, dan `db.query(...)`.
   * Penggabungan string (`+`) atau template literal (`${...}`) yang menyisipkan input pengguna (`req.body`, `req.query`, `req.params`) ke dalam string SQL.
2. **Pola Fungsi Berbahaya JS/DOM (CWE-79, CWE-94, CWE-78)**:
   * `eval(...)`, `new Function(...)`, `dangerouslySetInnerHTML`, `.innerHTML`, `child_process`, `exec(...)`, `execSync(...)`.

---

## 2. Tabel Unsafe Function Analysis — Sisi Kueri SQL (`backend/`)

| No | Lokasi Berkas & Baris | Pola / Pemanggilan Ditemukan | Sumber Input & Mekanisme Query | Status Keamanan | Penilaian & Mitigasi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `backend/controllers/articleController.js:45,55` (`queryArticleList`) | `pool.query(\`... ${whereClause} ... LIMIT $${limitIdx} OFFSET $${offsetIdx}\`, listParams)` | Input `category` & `search` masuk melalui array `params` (`$1..$n`); `page` & `limit` diparsing integer dengan batas aman (`1..100`). `whereClause` hanya dibentuk dari kondisi statis ber-placeholder. | **Aman (Parameterized)** | Tidak ada input pengguna yang digabungkan langsung ke teks SQL. |
| 2 | `backend/controllers/articleController.js:84,98` (`fetchArticleWithComments`) | `pool.query(\`... WHERE a.id = $1 ${statusFilter}\`, [articleId])` | `articleId` divalidasi oleh `validateArticleIdParam` (integer positif); `statusFilter` berupa konstanta internal (`"AND a.status = 'published'"` atau `""`). | **Aman (Parameterized)** | Input ID diikat lewat `$1`; `statusFilter` tidak berasal dari input user. |
| 3 | `backend/controllers/articleController.js:155` (`createArticle`) | `client.query('INSERT INTO articles (...) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())', [...])` | Seluruh field artikel (`title`, `description`, `image_url`, `category`, `status`) melewati `validateCreateArticleInput` dan diikat via `$1..$6`. | **Aman (Parameterized)** | Menggunakan transaksi (`BEGIN`/`COMMIT`) dan parameter binding penuh. |
| 4 | `backend/controllers/articleController.js:195,216` (`updateArticle`) | `client.query(\`UPDATE articles SET ${setClauses.join(', ')} WHERE id = $${params.length}\`, params)` | Nama kolom pada `setClauses` hanya diambil dari whitelist konstan `ALLOWED_UPDATE_FIELDS` (`title`, `description`, `category`, `status`, `image_url`); seluruh nilai diikat via `$1..$n`. | **Aman (Parameterized + Whitelist)** | Tidak ada nama kolom maupun nilai dari input klien yang masuk langsung ke SQL. |
| 5 | `backend/controllers/articleController.js:256,266` (`deleteArticle`) | `client.query('DELETE FROM articles WHERE id = $1', [articleId])` | `articleId` dipastikan integer positif oleh `validateArticleIdParam` dan diikat via `$1`. | **Aman (Parameterized)** | Aman dari SQL Injection dan parameter tampering. |
| 6 | `backend/utils/auditLog.js:16` (`recordAuditLog`) | `db.query('INSERT INTO audit_logs (...) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [...])` | `userId`, `action`, `entityType`, `entityId`, `details`, dan `ipAddress` seluruhnya memakai `$1..$6`. | **Aman (Parameterized)** | Tidak ada penggabungan string pada kueri audit log. |
| 7 | `backend/adminRoutes.js:77,87` (`GET /audit-logs`) | `pool.query(\`... ${whereClause} ... LIMIT $${...} OFFSET $${...}\`, listParams)` | Filter `action`, `entity_type`, `from`, `to` (regex `YYYY-MM-DD`), dan `search` seluruhnya masuk melalui `params` (`$1..$n`). | **Aman (Parameterized)** | Aman terhadap payload SQL injection pada parameter pencarian log. |
| 8 | `backend/adminRoutes.js:121,174,185` (`GET /users`, `PATCH /users/:id/status`) | `pool.query('... WHERE id = $1', [targetUserId])`, `pool.query('UPDATE users SET is_active = $1 ... WHERE id = $2', ...)` | `targetUserId` divalidasi oleh `parsePositiveIntId`; `is_active` wajib boolean murni (`typeof === 'boolean'`). | **Aman (Parameterized)** | Tidak ada raw SQL dengan input tidak tervalidasi. |
| 9 | `backend/articleRoutes.js:26,45,107,115,143,152,173,182` | `pool.query('... WHERE ... = $1', [...])` | `user.id`, `id` (hasil `validateArticleIdParam`), `commentId` (hasil `parsePositiveIntId`), dan `content` semuanya memakai `$1..$n`. | **Aman (Parameterized)** | Seluruh rute komentar dan artikel user memakai parameter binding. |
| 10 | `backend/auth.js:42–276` | `pool.query('... WHERE email = $1 / session_id = $1 / id = $1', [...])` | Seluruh operasi registrasi, OTP, login, sesi, dan logout menggunakan `$1..$n`. | **Aman (Parameterized)** | Tidak ada kueri dinamis berbasis string input. |
| 11 | `backend/database.js:19–101` & `migrate.js:9` & `seed.js:21–38` | `client.query('CREATE TABLE IF NOT EXISTS ...')`, `pool.query('... WHERE email = $1', [adminEmail])` | DDL statis pada `database.js`/`migrate.js`; `seed.js` memakai `$1..$3` untuk argumen CLI admin. | **Aman (Parameterized / Statis)** | Tidak memproses input HTTP publik. |

---

## 3. Hasil Pemindaian Fungsi Berbahaya Lainnya di `src/`

| Kategori Pola Berbahaya | Jumlah Temuan di `src/` | Keterangan |
| :--- | :---: | :--- |
| Penggabungan string input ke SQL (`+` / raw SQL injection) | **0** | Seluruh pemanggilan `.query()` di `backend/` menggunakan positional placeholder (`$1, $2, ...`). |
| `eval(...)` / `new Function(...)` | **0** | Tidak ditemukan eksekusi kode dinamis. |
| `dangerouslySetInnerHTML` / `.innerHTML` | **0** | Konten Markdown artikel dan komentar di `frontend/src/` dirender aman melalui teks JSX React (auto-escaping, SR-INP-03). |
| `child_process` / `exec(` / `execSync(` | **0** | Tidak ada eksekusi perintah OS dari input aplikasi. |

---

## 4. Kesimpulan Analisis

Hasil pemindaian pada seluruh 45 berkas di `src/` menunjukkan **0 kerentanan raw SQL maupun fungsi berbahaya**. Seluruh endpoint publik dan admin untuk modul **Artikel**, **Komentar**, **Pengguna**, **Autentikasi**, dan **Audit Log** telah memenuhi kebutuhan **SR-INP-02** dan **SR-INP-03**.
