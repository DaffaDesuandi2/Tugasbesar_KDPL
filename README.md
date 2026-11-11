# 📰 PosTera
### Portal Artikel Kampus Berbasis Web

**PosTera** merupakan aplikasi portal artikel kampus berbasis web yang dikembangkan dengan memperhatikan aspek keamanan perangkat lunak menggunakan kerangka kerja **Microsoft Security Development Lifecycle (SDL)**.

## 📌 Informasi Proyek

| Informasi | Keterangan |
|---|---|
| Nama Aplikasi | PosTera |
| Tema | Portal Artikel Kampus |
| Judul Proyek | Pengembangan Sistem Informasi Portal Artikel "PosTera" Berbasis Web Aman Menggunakan Kerangka Kerja Microsoft SDL |
| Platform | Web |
| Metodologi Keamanan | Microsoft Security Development Lifecycle (SDL) |
| Status | Dalam Pengembangan |

## 📖 Deskripsi Proyek

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

PosTera dirancang dengan mempertimbangkan beberapa aspek keamanan berikut:

| Aspek Keamanan | Rencana Implementasi |
|---|---|
| Authentication | Login dan pengelolaan sesi pengguna |
| Authorization | Pembatasan akses berdasarkan role Admin dan Mahasiswa |
| Access Control | Pengguna hanya dapat mengubah atau menghapus komentar miliknya |
| Input Validation | Validasi masukan untuk mengurangi risiko input berbahaya |
| Password Security | Penyimpanan kata sandi menggunakan hashing yang aman |
| Account Management | Penonaktifan akun pengguna oleh Admin |
| Security Testing | Pengujian terhadap potensi kerentanan aplikasi |

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

*Disesuaikan dengan teknologi yang dipilih oleh kelompok.*

| Komponen | Teknologi |
|---|---|
| Frontend | Belum ditentukan |
| Backend | Belum ditentukan |
| Database | Belum ditentukan |
| Version Control | Git & GitHub |
| Security Framework | Microsoft SDL |

## 👥 Anggota Kelompok

| No. | Nama Anggota | NIM | Peran |
|---|---|---|---|
| 1 | Muhammad Daffansyah Desuandi | 123140127 | [Peran] |
| 2 | [Nama Anggota 2] | [NIM] | [Peran] |
| 3 | Arsa Salsabila | 123140108 | [Peran] |
| 4 | [Nama Anggota 4] | [NIM] | [Peran] |
| 5 | [Nama Anggota 5] | [NIM] | [Peran] |

## 📂 Struktur Proyek

Struktur direktori akan disesuaikan dengan teknologi dan arsitektur aplikasi yang digunakan selama pengembangan.

## 🚀 Status Pengembangan

Proyek PosTera saat ini berada pada tahap perencanaan dan pengembangan awal. Fitur serta mekanisme keamanan akan dikembangkan dan diuji secara bertahap sesuai kebutuhan proyek.

## 📚 Referensi

- [Microsoft Security Development Lifecycle](https://www.microsoft.com/en-us/securityengineering/sdl)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**PosTera — Portal Artikel Kampus**

*Dikembangkan sebagai proyek penerapan keamanan perangkat lunak berbasis Microsoft SDL.*
