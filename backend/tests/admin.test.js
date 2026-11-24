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

/**
 * ============================================================================
 * HELPER FUNCTION: getCsrfToken
 * Mengambil token CSRF valid dari endpoint /api/auth/csrf-token
 * untuk disertakan pada request pengujian mutasi (POST/PUT/PATCH/DELETE)
 * agar lolos dari proteksi CSRF Middleware (SR-AUTH-03).
 * ============================================================================
 */
async function getCsrfToken() {
  const res = await fetch(`${baseUrl}/api/auth/csrf-token`);
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/postera_csrf=([^;]+)/);
  const token = data.csrfToken;
  const cookieHeader = match ? `postera_csrf=${match[1]}` : `postera_csrf=${token}`;

  return { token, cookieHeader };
}

// ============================================================================
// TEST CASE 6 (UJI POSITIF): ADMIN MENGUBAH STATUS KEAKTIFAN USER & AUDIT LOG
// 
// Kebutuhan Keamanan: SR-AUTHZ-01 (Otorisasi Admin) & SR-AUD-01 (Audit Trail)
// Sudut Pengujian: Positif (Alur kerja operasional normal yang sah)
// Deskripsi: Membuktikan bahwa Admin yang sah dapat menonaktifkan akun mahasiswa
//            yang melanggar aturan, dan sistem secara otomatis mencatat bukti aksi
//            tersebut ke dalam tabel audit_logs untuk kebutuhan investigasi forensik.
// ============================================================================
test('Security Test 6: Admin berhasil menonaktifkan pengguna & mencatat audit log (HTTP 200)', async () => {
  // 1. SETUP CSRF: Mengambil token CSRF agar lolos dari proteksi anti-CSRF
  const { token: csrfToken, cookieHeader } = await getCsrfToken();

  // 2. SETUP DATA UJI: Membuat 1 akun Admin aktif yang memiliki token sesi login sah
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin PosTera',
    email: 'admin.utama@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin',
    isActive: true
  });

  // 3. SETUP DATA TARGET: Membuat 1 akun Mahasiswa aktif yang nantinya akan dinonaktifkan
  const { user: studentUser } = await createUserAndSession({
    name: 'Mahasiswa Uji',
    email: 'mahasiswa.uji@student.itera.ac.id',
    password: 'StudentPassword123',
    role: 'mahasiswa',
    isActive: true
  });

  // 4. EKSEKUSI REQUEST: Admin mengirim request HTTP PATCH dengan header CSRF valid
  const res = await fetch(`${baseUrl}/api/admin/users/${studentUser.id}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`, // Token sesi Admin
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,                  // Token proteksi CSRF
      'Cookie': cookieHeader                      // Cookie CSRF
    },
    body: JSON.stringify({ is_active: false })    // Parameter perubahan: dinonaktifkan
  });

  // 5. VERIFIKASI STATUS HTTP: Server wajib merespons dengan kode 200 OK
  assert.strictEqual(
    res.status,
    200,
    'Admin yang sah harus berhasil menonaktifkan status akun pengguna dengan kode HTTP 200'
  );

  // 6. VERIFIKASI BODY RESPON: Memastikan data JSON yang dikembalikan mengonfirmasi is_active bernilai false
  const data = await res.json();
  assert.strictEqual(
    data.user.is_active,
    false,
    'Respons JSON dari server harus mengonfirmasi status pengguna kini bernilai false'
  );

  // 7. VERIFIKASI DATABASE (INTEGRITAS DATA): Memastikan nilai di tabel users benar-benar berubah di PostgreSQL
  const dbCheck = await pool.query(
    'SELECT is_active FROM users WHERE id = $1',
    [studentUser.id]
  );
  assert.strictEqual(
    dbCheck.rows[0].is_active,
    false,
    'Integritas DB: Nilai kolom is_active pada tabel users harus benar-benar berubah menjadi false'
  );

  // 8. VERIFIKASI AUDIT LOG (SR-AUD-01): Memastikan aksi Admin otomatis terekam tanpa bisa dimanipulasi
  const logCheck = await pool.query(
    'SELECT action, entity_type, entity_id FROM audit_logs WHERE entity_id = $1',
    [studentUser.id]
  );
  assert.ok(
    logCheck.rows.length > 0,
    'Kritis: Aksi perubahan status akun WAJIB tercatat di tabel audit_logs untuk kepatuhan SDL (SR-AUD-01)'
  );
  assert.strictEqual(
    logCheck.rows[0].action,
    'TOGGLE_USER_STATUS',
    'Nama action pada audit_logs harus akurat yaitu TOGGLE_USER_STATUS'
  );
});

// ============================================================================
// TEST CASE 7 (UJI NEGATIF): VALIDASI INPUT & KETAHANAN PARAMETER (TYPE SAFETY)
// 
// Kebutuhan Keamanan: SR-VAL-01 (Validasi Input Server-Side & Anti-Tampering)
// Sudut Pengujian: Negatif (Input sengaja dirusak/manipulasi parameter)
// Deskripsi: Membuktikan bahwa server menolak manipulasi parameter URL (ID bukan integer)
//            dan manipulasi tipe data body (is_active dikirim string, bukan boolean).
// ============================================================================
test('Security Test 7: Validasi input menolak parameter tidak valid (HTTP 422)', async () => {
  // 1. SETUP: Ambil token CSRF dan akun Admin sah
  const { token: csrfToken, cookieHeader } = await getCsrfToken();
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin PosTera',
    email: 'admin.validator@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin',
    isActive: true
  });

  // 2. SKENARIO NEGATIF A (Parameter Tampering): Mengirim ID berupa string 'abc'
  const resBadId = await fetch(`${baseUrl}/api/admin/users/abc/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({ is_active: false })
  });
  // Server harus menolak format salah dengan HTTP 422
  assert.strictEqual(
    resBadId.status,
    422,
    'Parameter ID yang bukan integer positif harus ditolak dengan kode HTTP 422'
  );

  // 3. SKENARIO NEGATIF B (Type Confusion): Mengirim is_active berupa string bukan boolean
  const resBadBody = await fetch(`${baseUrl}/api/admin/users/1/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({ is_active: 'bukan_boolean' })
  });
  // Server harus menolak tipe non-boolean dengan HTTP 422
  assert.strictEqual(
    resBadBody.status,
    422,
    'Field is_active yang bukan bertipe boolean murni (true/false) harus ditolak dengan kode HTTP 422'
  );
});

// ============================================================================
// TEST CASE 8 (KONDISI BATAS): PENCEGAHAN ADMIN MENONAKTIFKAN DIRINYA SENDIRI
// 
// Kebutuhan Keamanan: SR-AUTHZ-02 & Pencegahan DoS / System Lockout
// Sudut Pengujian: Kondisi Batas / Edge Case
// Deskripsi: Memastikan sistem memblokir jika Admin tidak sengaja mencoba menonaktifkan
//            akun miliknya sendiri demi mencegah kelumpuhan akses admin (lockout).
// ============================================================================
test('Security Test 8: Admin dilarang menonaktifkan akun miliknya sendiri (HTTP 400)', async () => {
  // 1. SETUP: Ambil token CSRF dan akun Admin
  const { token: csrfToken, cookieHeader } = await getCsrfToken();
  const { user: adminUser, sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin Utama',
    email: 'admin.self@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin',
    isActive: true
  });

  // 2. SKENARIO UJI: Admin mengirim request PATCH menonaktifkan ID miliknya sendiri
  const res = await fetch(`${baseUrl}/api/admin/users/${adminUser.id}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({ is_active: false })
  });

  // 3. VERIFIKASI: Server wajib menolak dengan kode HTTP 400 Bad Request
  assert.strictEqual(
    res.status,
    400,
    'Sistem wajib menolak self-deactivation dengan HTTP 400 demi mencegah penguncian sistem (system lockout)'
  );

  // 4. VERIFIKASI PESAN: Pesan penolakan harus jelas
  const data = await res.json();
  assert.ok(
    data.detail.includes('tidak diizinkan') || data.detail.includes('lockout'),
    'Pesan penolakan harus jelas menjelaskan bahwa admin tidak boleh menonaktifkan akunnya sendiri'
  );
});