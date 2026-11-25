# Test Case Keamanan Aplikasi PosTera

Rancang test case dari empat sudut (materi pengujian keamanan):
* **Positif**: Data sah diterima dan diproses sesuai spesifikasi.
* **Negatif**: Data atau aksi tidak sah ditolak (bukan hanya input kosong; uji juga format salah, input sangat panjang, karakter khusus, urutan alur yang dilanggar, dan identitas pengguna lain).
* **Skenario Dunia Nyata**: Situasi yang mungkin terjadi sehari-hari oleh pengguna biasa.
* **Kondisi Batas**: Nilai di tepi aturan (*boundary values*, panjang maksimal/minimal, batas percobaan login).

---

### Tabel Test Case

| ID | Jenis | SR | Prasyarat | Langkah | Data uji | Hasil diharapkan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | | | | | | |
| **TC-02** | | | | | | |
| **TC-03** | | | | | | |
| **TC-04** | | | | | | |
| **TC-05** | | | | | | |
| **TC-06** | Positif | SR-AUTHZ-01, SR-INP-01, SR-INP-04 | Akun Admin aktif (`role = 'admin'`) sudah login dan memiliki cookie sesi + token CSRF valid | 1. Kirim `POST /api/articles` dengan data artikel valid.<br>2. Baca artikel melalui `GET /articles` dan `GET /articles/:id`.<br>3. Ubah artikel melalui `PUT /api/articles/:id` (menjadi `archived`) dan `PATCH /api/articles/:id` (menjadi `published`).<br>4. Hapus artikel melalui `DELETE /api/articles/:id`. | `title`: `"Panduan Akademik Mahasiswa Baru"`, `category`: `"akademik"`, `status`: `"published"`, `description`: `"Isi panduan lengkap."`, `image_url`: `"https://example.com/panduan.jpg"` | `POST` mengembalikan HTTP `201`, `GET /articles` & `GET /articles/:id` mengembalikan HTTP `200` saat `published` (dan `404` saat `archived`), `PUT`/`PATCH` & `DELETE` mengembalikan HTTP `200` dan perubahan tersinkron ke tabel `articles`. |
| **TC-07** | Kondisi Batas & Negatif | SR-INP-01 | Akun Admin aktif sudah login dengan token sesi & token CSRF valid | 1. Kirim `POST /api/articles` dengan judul kosong `""`.<br>2. Kirim `POST /api/articles` dengan judul 2 karakter (`"Hi"`).<br>3. Kirim `POST /api/articles` dengan judul 151 karakter.<br>4. Uji batas sah 3 karakter (`"ABC"`) dan 150 karakter. | `title`: `""`, `"Hi"`, `"X".repeat(151)`, serta batas sah `"ABC"` dan `"A".repeat(150)` | Input `< 3` karakter (kosong / 2 karakter) dan `> 150` karakter (151 karakter) ditolak HTTP `422` dan tidak tersimpan ke tabel `articles`; judul 3 dan 150 karakter lolos validasi. |
| **TC-08** | Negatif | SR-AUTHZ-01, SR-INP-04 | Akun User Biasa (`role = 'mahasiswa'`) login dengan sesi valid dan token CSRF valid; tersedia 1 artikel milik Admin | 1. Dengan sesi mahasiswa, kirim `POST /api/articles`.<br>2. Kirim `PUT /api/articles/:id`, `PATCH /api/articles/:id`, dan `DELETE /api/articles/:id`.<br>3. Kirim juga `POST /api/articles` tanpa token CSRF. | Sesi `mahasiswa` valid + payload artikel sah; serta request Admin tanpa header `x-csrf-token` | Seluruh percobaan CRUD artikel oleh mahasiswa ditolak middleware `requireAdmin` dengan HTTP `403` (`"Akses ditolak."`); request tanpa token CSRF ditolak HTTP `403`; data artikel tidak berubah. |
| **TC-09** | Negatif & Skenario Dunia Nyata | SR-INP-02 | Terdapat artikel `published` dan artikel `archived` di tabel `articles` | 1. Kirim `GET /articles?search=' OR 1=1 --` sebagai pengunjung publik.<br>2. Kirim `GET /articles/1' OR '1'='1` pada rute detail artikel. | Parameter `search`: `' OR 1=1 --`; Parameter `:id`: `1' OR '1'='1` | Query memakai parameterized query (`$1`) sehingga payload `' OR 1=1 --` diperlakukan sebagai teks pencarian literal (HTTP `200`, tidak membocorkan artikel `archived` maupun error SQL); `:id` non-integer ditolak HTTP `422`. |
| **TC-10** | Positif | SR-LOG-01 | Akun Admin aktif sudah login dengan sesi & token CSRF valid | 1. Admin membuat artikel (`POST /api/articles`).<br>2. Admin mengubah artikel (`PUT /api/articles/:id` / `PATCH /api/articles/:id`).<br>3. Admin menghapus artikel (`DELETE /api/articles/:id`).<br>4. Periksa isi tabel `audit_logs` dan endpoint `GET /api/admin/audit-logs`. | Aksi CRUD pada artikel ID target oleh Admin `admin@postera.ac.id` | Tabel `audit_logs` merekam baris lengkap untuk setiap aksi (`CREATE`, `UPDATE`, `DELETE`) dengan `entity_type = 'articles'`, `entity_id` artikel, `user_id` Admin, `ip_address`, dan `details` tanpa membocorkan token sesi atau password. |
| **TC-11** | | | | | | |
| **TC-12** | | | | | | |
| **TC-13** | | | | | | |
| **TC-14** | | | | | | |
| **TC-15** | | | | | | |
| **TC-16** | | | | | | |
| **TC-17** | | | | | | |
| **TC-18** | | | | | | |
| **TC-19** | | | | | | |
| **TC-20** | | | | | | |
| **TC-21** | | | | | | |
| **TC-22** | | | | | | |
| **TC-23** | | | | | | |
| **TC-24** | | | | | | |
| **TC-25** | | | | | | |
