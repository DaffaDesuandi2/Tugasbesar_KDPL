# Analisis SAST dan SCA — PosTera, Minggu ke-3

**Proyek:** PosTera — Kelompok 06  
**Penanggung jawab:** Muhammad Daffansyah Desuandi (Security Lead)  
**Tanggal analisis:** 26 November 2026  
**Status:** Audit awal selesai; tindak lanjut temuan menunggu pemilik modul.

## 1. Metode dan bukti

- **SAST:** Semgrep OSS versi `1.187.0`, dengan hasil asli `docs/evidence/semgrep-m3.json`. Target pemindaian: folder `backend/` dan `frontend/`; 50 path tercantum pada laporan scanner. Hasil: 1 finding (`WARNING`), 0 error utama. Terdapat 6 peringatan *fixpoint timeout* pada analisis taint; ini keterbatasan analisis, **bukan** enam temuan kerentanan.
- **SCA backend:** `npm audit --json`, hasil asli `docs/evidence/npm-audit-backend.json`. Metadata mencatat 89 dependensi total dan 0 vulnerability yang dilaporkan.
- **SCA frontend:** `npm audit --json`, hasil asli `docs/evidence/npm-audit-frontend.json`. Metadata mencatat 314 dependensi total dan 0 vulnerability yang dilaporkan.
- **Unit test otorisasi:** `docs/evidence/authorization-test-m3.txt`: 8 lulus, 0 gagal. Hasil unit test ini tidak menggantikan uji integrasi HTTP/DB.

## 2. Hasil SAST dan code review

| ID | Sumber | Lokasi | Temuan | Status validasi | Risiko dan rekomendasi | Status perbaikan |
|---|---|---|---|---|---|---|
| SAST-01 | Semgrep (`WARNING`) | `backend/database.js:13` | Konfigurasi koneksi cloud memakai `ssl: { rejectUnauthorized: false }`, yang melewati verifikasi sertifikat TLS. | **Valid pada pola kode**; risiko aktual bergantung pada cara koneksi/deployment. | Berpotensi mempermudah MITM terhadap koneksi DB. Minta pemilik modul menggunakan TLS dengan verifikasi sertifikat dan CA terpercaya bila diperlukan; uji kembali koneksi cloud/lokal. | Terbuka; koordinasi dengan Grace. |
| CR-01 | Review manual, **bukan temuan Semgrep** | `backend/database.js`, definisi `connectionString` | Terdapat fallback `DATABASE_URL` yang berisi kredensial PostgreSQL langsung di source code. | **Valid pada kode yang ditinjau.** | Hindari menyimpan rahasia dalam source/repo; wajibkan konfigurasi environment, rotasi kredensial jika sudah terekspos, dan tinjau riwayat Git. Jangan menyalin password asli ke laporan. | Terbuka; koordinasi dengan Grace. |

**Aturan klasifikasi:** Hasil Semgrep pertama hanya **1 temuan**, yaitu `SAST-01`. `CR-01` berasal dari review manual dan dilaporkan terpisah. Tidak ada temuan yang dinyatakan *false positive* pada tahap ini.

## 3. Hasil SCA

| Komponen | Dependensi tercatat | Info | Low | Moderate | High | Critical | Total vulnerability |
|---|---:|---:|---:|---:|---:|---:|---:|
| Backend | 89 | 0 | 0 | 0 | 0 | 0 | 0 |
| Frontend | 314 | 0 | 0 | 0 | 0 | 0 | 0 |

**Interpretasi:** `npm audit` tidak melaporkan advisori kerentanan terhadap dependency pada saat pemindaian. Ini tidak membuktikan aplikasi bebas dari segala kerentanan.

## 4. Tindak lanjut dan verifikasi

1. Security Lead mengirim `SAST-01` dan `CR-01` kepada Grace sebagai penanggung jawab konfigurasi database; hindari mengedit modul rekan tanpa koordinasi.
2. Grace meninjau konfigurasi SSL/TLS dan rahasia koneksi database, lalu membuat commit/PR perbaikan jika disetujui tim.
3. Security Lead mengambil versi terbaru (`git pull` setelah perubahan diterima), menjalankan ulang Semgrep dan `npm audit`, dan menyimpan hasil asli pemindaian ulang di `docs/evidence/` dengan nama berbeda.
4. Validasi koneksi PostgreSQL lokal/cloud dan dokumentasikan apakah temuan sudah hilang serta apakah fitur tetap bekerja.
5. Lengkapi review otorisasi route dan TC-16–TC-20 secara terpisah; statusnya **belum dapat dinyatakan lulus** dari bukti SAST/SCA saja.

## 5. Kesimpulan

Pemindaian SAST pertama berhasil dan menghasilkan **1 finding Semgrep** yang perlu ditindaklanjuti. Review manual menemukan **1 isu tambahan** berupa kredensial database yang tertulis di kode. Audit dependensi backend dan frontend masing-masing melaporkan **0 vulnerability**. Bukti awal dapat di-commit tanpa mengubah kode database rekan; setelah mitigasi dilakukan, diperlukan pemindaian ulang.
