/**
 * ============================================================================
 * PENGUJIAN KEAMANAN OTOMATIS (AUTOMATED SECURITY TEST) - MODUL MANAJEMEN ADMIN
 * 
 * Tujuan Pengujian:
 * 1. Memverifikasi prinsip "Deny by Default" pada rute sensitif Admin.
 * 2. Mencegah ancaman OWASP Top 10 A01: Broken Access Control (BOLA/IDOR/Privilege Escalation).
 * 3. Memverifikasi kontrol otorisasi server-side (SR-AUTHZ-01).
 * 4. Memastikan pencegahan kebocoran data sensitif / Information Disclosure (CWE-200).
 * ============================================================================
 */

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import app from '../server.js';
import { initDatabase, pool } from '../database.js';
import { hashPassword } from '../security.js';

let server;
let baseUrl;

// 1. SETUP SEBELUM SEMUA TEST DIMULAI
// Menjalankan server Express pada port acak (port 0) untuk keperluan testing HTTP secara nyata
before(async () => {
  await initDatabase();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

// 2. TEARDOWN SETELAH SEMUA TEST SELESAI
// Mematikan server Express dan menutup koneksi database PostgreSQL pool
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// 3. ISOLASI DATA (SEBELUM SETIAP TEST CASE)
// Membersihkan tabel sesi dan tabel users agar data uji tidak saling mengotori antar-test case
beforeEach(async () => {
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM users');
});

/**
 * HELPER FUNCTION: createUserAndSession
 * Fungsi bantuan untuk membuat akun pengguna (admin/user) beserta token sesi valid
 * langsung di database untuk mempermudah simulasi pengujian HTTP.
 */
async function createUserAndSession({ name, email, password, role = 'mahasiswa', isActive = true }) {
  // Hash password dengan bcrypt sesuai standar keamanan (SR-AUTH-01)
  const pwdHash = await hashPassword(password);

  // Simpan pengguna ke tabel users
  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active, failed_login_attempts, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())
     RETURNING id, name, email, role, is_active`,
    [name, email, pwdHash, role, isActive]
  );
  const user = userRes.rows[0];

  // Buat sesi autentikasi yang berlaku selama 24 jam ke depan
  const sessionId = `test_sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Simpan sesi ke tabel sessions
  await pool.query(
    `INSERT INTO sessions (session_id, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [sessionId, user.id, expiresAt]
  );

  return { user, sessionId };
}

// ----------------------------------------------------------------------------
// TEST CASE 1: VERIFIKASI PENGUNJUNG TANPA AUTENTIKASI (ANONYMOUS ACCESS)
// ----------------------------------------------------------------------------
test('Security Test 1: Akses rute admin tanpa login harus ditolak (HTTP 401)', async () => {
  // Skenario: Penyerang atau pengguna publik mencoba menembak URL /api/admin/users langsung tanpa membawa sesi/cookie
  const res = await fetch(`${baseUrl}/api/admin/users`);

  // Ekspektasi: Server wajib menolak dengan status HTTP 401 Unauthorized
  assert.strictEqual(res.status, 401, 'Harus merespons 401 jika tanpa sesi autentikasi');

  const data = await res.json();
  assert.ok(data.detail.includes('Autentikasi'), 'Pesan error harus menginformasikan autentikasi diperlukan');
});

// ----------------------------------------------------------------------------
// TEST CASE 2: VERIFIKASI BROKEN ACCESS CONTROL (ROLE-BASED ACCESS CONTROL)
// ----------------------------------------------------------------------------
test('Security Test 2 (Broken Access Control): User mahasiswa dilarang mengakses rute admin (HTTP 403)', async () => {
  // Skenario: Mahasiswa yang terautentikasi (memiliki sesi login sah) mencoba mengakses menu Admin
  const { sessionId } = await createUserAndSession({
    name: 'Mahasiswa Tester',
    email: 'arsa.tester@student.itera.ac.id',
    password: 'PasswordAman123',
    role: 'mahasiswa',
    isActive: true
  });

  // Kirim request ke endpoint admin dengan membawa token sesi mahasiswa
  const res = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${sessionId}` }
  });

  // Ekspektasi: Server wajib menolak dengan HTTP 403 Forbidden (Deny by default untuk role bukan admin)
  assert.strictEqual(res.status, 403, 'Mahasiswa wajib ditolak dari endpoint admin dengan kode 403');

  const data = await res.json();
  assert.strictEqual(data.detail, 'Akses ditolak.', 'Detail pesan error harus menyatakan akses ditolak');
});

// ----------------------------------------------------------------------------
// TEST CASE 3: VERIFIKASI AKSES SAH OLEH ADMIN (AUTHORIZED ACCESS)
// ----------------------------------------------------------------------------
test('Security Test 3: Admin yang sah berhasil mengakses daftar seluruh pengguna (HTTP 200)', async () => {
  // Skenario: Akun Admin login sah dan ingin melihat daftar user untuk manajemen akun (Fitur F-7)
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin Utama',
    email: 'admin.arsa@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin',
    isActive: true
  });

  // Buat 1 akun mahasiswa tambahan di database sebagai data pembanding
  await createUserAndSession({
    name: 'Mahasiswa PosTera',
    email: 'mahasiswa1@student.itera.ac.id',
    password: 'PasswordMhs123',
    role: 'mahasiswa',
    isActive: true
  });

  // Kirim request menggunakan sesi Admin
  const res = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminSessionId}` }
  });

  // Ekspektasi: Server mengizinkan dengan HTTP 200 OK dan mengembalikan daftar array user
  assert.strictEqual(res.status, 200, 'Admin yang sah harus diizinkan dengan kode 200');

  const data = await res.json();
  assert.ok(data.message.includes('Daftar pengguna berhasil dimuat'));
  assert.strictEqual(data.total, 2, 'Total pengguna harus berjumlah 2 (1 admin + 1 mahasiswa)');
  assert.strictEqual(data.admin.role, 'admin', 'Data admin yang sedang login harus terverifikasi');
  assert.strictEqual(Array.isArray(data.users), true, 'Respon users harus berbentuk array');
  assert.strictEqual(data.users.length, 2);
});

// ----------------------------------------------------------------------------
// TEST CASE 4: PENCEGAHAN KEBOCORAN KREDENSIAL (INFORMATION DISCLOSURE / CWE-200)
// ----------------------------------------------------------------------------
test('Security Test 4 (Information Disclosure): Respon API dilarang membocorkan password_hash pengguna', async () => {
  // Skenario: Admin mengambil data daftar pengguna. Sistem harus memastikan kolom sensitif password_hash tidak ikut terkirim.
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin Audit',
    email: 'admin.audit@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin',
    isActive: true
  });

  const res = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminSessionId}` }
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.ok(data.users.length > 0, 'Harus ada data user yang dikembalikan');

  // Periksa setiap objek user satu per satu
  for (const user of data.users) {
    // KRITIS: password_hash HARUS undefined! Tidak boleh bocor ke client walaupun client-nya adalah Admin!
    assert.strictEqual(
      user.password_hash,
      undefined,
      'KRITIS: password_hash TIDAK BOLEH bocor pada respon API demi mencegah credential theft (SR-AUTH-01)'
    );
    // Pastikan data publik yang aman tetap tersedia
    assert.ok(user.id, 'ID pengguna harus ada');
    assert.ok(user.name, 'Nama pengguna harus ada');
    assert.ok(user.email, 'Email pengguna harus ada');
    assert.ok(user.role, 'Role pengguna harus ada');
  }
});

// ----------------------------------------------------------------------------
// TEST CASE 5: VERIFIKASI STATUS KEAKTIFAN AKUN (ACCOUNT STATUS CHECK)
// ----------------------------------------------------------------------------
test('Security Test 5: Akun admin yang berstatus dinonaktifkan (is_active: false) ditolak dari sistem (HTTP 403)', async () => {
  // Skenario: Admin yang akunnya telah disuspend/dinonaktifkan mencoba mengakses endpoint
  const { sessionId: inactiveAdminSessionId } = await createUserAndSession({
    name: 'Admin Nonaktif',
    email: 'admin.nonaktif@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin',
    isActive: false // Akun dalam status non-aktif
  });

  const res = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { 'Authorization': `Bearer ${inactiveAdminSessionId}` }
  });

  // Ekspektasi: Server wajib menolak akun non-aktif dengan status HTTP 403
  assert.strictEqual(res.status, 403, 'Akun nonaktif tidak boleh diizinkan mengakses sistem');

  const data = await res.json();
  assert.ok(
    data.detail.includes('dinonaktifkan') || data.detail.includes('Akses ditolak'),
    'Pesan penolakan harus jelas'
  );
});
