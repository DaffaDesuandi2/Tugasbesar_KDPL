# SECURITY TEST PLAN  APLIKASI POSTERA

**Kelompok 06**  

---

## 1. Tujuan Pengujian

Membuktikan secara nyata bahwa seluruh kontrol keamanan PosTera berjalan sesuai spesifikasi (`SR-AUTH-01` s.d. `SR-DEP-01`):

- Rute Admin tertutup mutlak bagi publik & Mahasiswa (*Deny by Default*).
- Mahasiswa dilarang mengubah/menghapus komentar milik user lain (Pencegahan IDOR/BOLA).
- Sistem kebal terhadap SQL Injection, Stored XSS, pemalsuan request (CSRF), dan pembajakan sesi.

---

## 2. Cakupan Pengujian (Scope)

### Dalam Cakupan (In-Scope)
- **Modul Autentikasi:** Registrasi (`@student.itera.ac.id`), Login (*rate limit* 5x/menit), Logout, dan verifikasi OTP.
- **Modul Sesi:** Regenerasi token sesi, batas kedaluwarsa (`expires_at`), dan cookie `HttpOnly`.
- **Modul Artikel (Admin & Publik):** Pencarian publik, pembacaan, dan CRUD artikel Admin.
- **Modul Komentar (Mahasiswa):** CRUD komentar dan validasi kepemilikan objek (`comment.user_id === req.user.id`).
- **Modul Manajemen Pengguna & Audit Log (Admin):** Daftar user, status aktif/nonaktif akun, dan pencatatan `audit_logs`.

### Di Luar Cakupan (Out-of-Scope)
- Infrastruktur internal cloud Supabase.
- Serangan Denial of Service (DoS / *flooding* jaringan).
- Pengujian domain atau jaringan eksternal di luar instans PosTera.

---

## 3. Lingkungan Pengujian (Environment)

- **Frontend:** React + Vite (Port `5173`)
- **Backend:** Node.js + Express.js (Port `8000`)
- **Database:** PostgreSQL (Supabase Cloud)
- **Konfigurasi:** Server lokal latihan simulasi produksi (`NODE_ENV=production`) untuk verifikasi penanganan galat & mode debug mati.
- **Alat Uji:** DevTools Browser, Postman/cURL, Semgrep (SAST), `npm audit` (SCA), dan OWASP ZAP (DAST).

---

## 4. Akun & Data Uji (Dummy Data)

| Username | Email | Peran & Keterangan |
| :--- | :--- | :--- |
| `admin_uji` | `admin@postera.ac.id` | Admin aktif |
| `admin_nonaktif` | `admin.nonaktif@postera.ac.id` | Admin nonaktif |
| `user_a` | `user_a@student.itera.ac.id` | Mahasiswa, pemilik komentar uji A |
| `user_b` | `user_b@student.itera.ac.id` | Mahasiswa, penguji IDOR |
| `user_nonaktif` | `nonaktif@student.itera.ac.id` | Mahasiswa status nonaktif |

---

## 5. Metode & Jenis Pengujian

1. **Manual Security Testing (25 Test Case):** Menguji dari 4 sudut (positif, negatif, skenario dunia nyata, dan kondisi batas).
2. **Automated Testing:** Eksekusi script backend (`npm test`).
3. **SAST:** Pemindaian kode sumber dengan Semgrep.
4. **SCA:** Audit dependensi pihak ketiga dengan `npm audit`.
5. **DAST:** Pemindaian aktif & *spidering* dengan OWASP ZAP (Minggu 4).
6. **Fuzzing Sederhana:** Menguji karakter liar, string panjang, dan tipe data salah pada kolom pencarian artikel dan kolom komentar.
7. **Uji Silang Antar-Kelompok:** Pengujian bersama kelompok lain pada Minggu 5.

---

## 6. Kriteria Masuk & Keluar (Entry & Exit)

- **Kriteria Masuk:** Seluruh fitur CRUD utama selesai dan dibekukan (*feature freeze* Minggu 4).
- **Kriteria Keluar:**
  - 100% dari 25 *test case* telah dieksekusi dan dicatat di *Test Log*.
  - Nol temuan berstatus *Critical* dan *High* yang belum tertangani sesuai batas *Bug Bar*.
  - Seluruh *Security Requirements* terbukti berstatus "Terpenuhi" (atau memiliki catatan *Accepted Risk* tertulis untuk tingkat Sedang/Rendah sesuai *Bug Bar*).

---

## 7. Jadwal & Matriks Uji Silang Internal

### Linimasa Pelaksanaan
- **Minggu 3:** Penyusunan draf 25 *test case*, SAST (Semgrep), SCA (`npm audit`), & bukti awal penolakan IDOR.
- **Minggu 4:** Eksekusi penuh 25 *test case* (uji silang), DAST (OWASP ZAP), & *fuzzing* input.
- **Minggu 5:** Uji silang antar-kelompok, *retest* perbaikan temuan, & *regression testing*.

### Pembagian Penguji (Tidak Menguji Modul Sendiri)

| Modul | Pembuat Modul | Penguji (Cross-Tester) |
| :--- | :--- | :--- |
| Modul Autentikasi & Sesi | Andre | Grace & Arsa |
| Modul CRUD Artikel & SQLi | Grace | Andre & Daffa |
| Modul Komentar, Anti-XSS & IDOR | Ragil | Daffa & Arsa |
| Modul Manajemen Pengguna | Arsa | Ragil & Andre |
| Modul Middleware RBAC & Audit Log | Daffa | Ragil & Grace |

---

## 8. Prioritas Pengujian (Risk-Based)

1. **Prioritas 1 (Kritis):** Otorisasi rute Admin (*Deny by Default*), pencegahan IDOR komentar, anti-SQL Injection, dan integritas hash `bcrypt`.
2. **Prioritas 2 (Tinggi):** Regenerasi sesi login, invalidasi logout, proteksi CSRF, dan pencegahan *Stored XSS*.
3. **Prioritas 3 (Sedang):** Validasi batas panjang input, kelengkapan *audit log*, dan pesan galat generik saat produksi.