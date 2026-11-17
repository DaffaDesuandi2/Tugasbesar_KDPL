import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import app from '../server.js';
import { pool } from '../database.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM users');
});

test('1. Registrasi berhasil dan password terenkripsi bcrypt di database', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Andre Prasetya',
      email: 'andre.node@itera.ac.id',
      password: 'PasswordAman123'
    })
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.email, 'andre.node@itera.ac.id');
  assert.strictEqual(data.role, 'mahasiswa');
  assert.strictEqual(data.is_active, true);
  assert.strictEqual(data.password_hash, undefined); // Password tidak boleh bocor

  // Cek database
  const dbUser = await pool.query('SELECT * FROM users WHERE email = $1', ['andre.node@itera.ac.id']);
  assert.strictEqual(dbUser.rows.length, 1);
  assert.ok(dbUser.rows[0].password_hash.startsWith('$2a$') || dbUser.rows[0].password_hash.startsWith('$2b$'));
  assert.notStrictEqual(dbUser.rows[0].password_hash, 'PasswordAman123');
});

test('2. Registrasi menolak password yang lemah (< 8 karakter / tanpa angka / huruf besar)', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Lemah',
      email: 'weak@itera.ac.id',
      password: 'lemah'
    })
  });

  assert.strictEqual(res.status, 422);
});

test('3. Login berhasil, menerbitkan session_id baru, dan meregenerasi sesi (Anti-Session Fixation)', async () => {
  // Register dulu
  await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tester Login',
      email: 'login.test@itera.ac.id',
      password: 'PasswordKuat123'
    })
  });

  // Login 1
  const loginRes1 = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'login.test@itera.ac.id',
      password: 'PasswordKuat123'
    })
  });

  assert.strictEqual(loginRes1.status, 200);
  const data1 = await loginRes1.json();
  const session1 = data1.session_id;
  assert.ok(session1 && session1.length > 20);

  // Cek cookie HTTP-Only
  const cookieHeader = loginRes1.headers.get('set-cookie');
  assert.ok(cookieHeader && cookieHeader.includes('postera_session='));
  assert.ok(cookieHeader.toLowerCase().includes('httponly'));

  // Login 2 (Regenerasi Sesi Baru)
  const loginRes2 = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `postera_session=${session1}`
    },
    body: JSON.stringify({
      email: 'login.test@itera.ac.id',
      password: 'PasswordKuat123'
    })
  });

  assert.strictEqual(loginRes2.status, 200);
  const data2 = await loginRes2.json();
  const session2 = data2.session_id;

  // Session ID harus berbeda (Regenerasi)
  assert.notStrictEqual(session1, session2);

  // Pastikan sesi lama sudah dihapus dari PostgreSQL
  const oldDbSession = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [session1]);
  assert.strictEqual(oldDbSession.rows.length, 0);

  const newDbSession = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [session2]);
  assert.strictEqual(newDbSession.rows.length, 1);
});

test('4. Logout menghapus sesi dari database secara permanen', async () => {
  await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Logout Test',
      email: 'logout.test@itera.ac.id',
      password: 'Password123'
    })
  });

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'logout.test@itera.ac.id',
      password: 'Password123'
    })
  });
  const { session_id } = await loginRes.json();

  // Cek /me sebelum logout
  const meRes1 = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${session_id}` }
  });
  assert.strictEqual(meRes1.status, 200);

  // Logout
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session_id}` }
  });
  assert.strictEqual(logoutRes.status, 200);

  // Cek /me setelah logout harus ditolak 401
  const meRes2 = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${session_id}` }
  });
  assert.strictEqual(meRes2.status, 401);
});

test('5. Rate limiter login memblokir serangan brute force (maks 5 request/menit)', async () => {
  for (let i = 0; i < 5; i++) {
    await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'attacker@itera.ac.id',
        password: 'SalahPassword123'
      })
    });
  }

  // Request ke-6 harus diblokir oleh rate limiter (HTTP 429)
  const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'attacker@itera.ac.id',
      password: 'SalahPassword123'
    })
  });

  assert.strictEqual(blockedRes.status, 429);
  const data = await blockedRes.json();
  assert.ok(data.detail.includes('Terlalu banyak'));
});
