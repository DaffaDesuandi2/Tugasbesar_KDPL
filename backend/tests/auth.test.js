import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import app from '../server.js';
import { initDatabase, pool } from '../database.js';

let server;
let baseUrl;

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

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM users');
});

async function getCsrf() {
  const res = await fetch(`${baseUrl}/api/auth/csrf-token`);
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/postera_csrf=([^;]+)/);
  const token = data.csrfToken;
  const cookieHeader = match ? `postera_csrf=${match[1]}` : `postera_csrf=${token}`;

  return {
    token,
    cookieHeader
  };
}

test('TC-01: registrasi pengguna dengan input valid dan invalid', async () => {
  const { token, cookieHeader } = await getCsrf();

  const invalidRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      name: 'User Invalid',
      email: 'bukan-email-itera@gmail.com',
      password: 'lemah'
    })
  });
  assert.strictEqual(invalidRes.status, 400);

  const validRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      name: 'Andre Prasetya',
      email: 'andre.node@student.itera.ac.id',
      password: 'PasswordAman123'
    })
  });
  assert.strictEqual(validRes.status, 201);
  const user = await validRes.json();
  assert.strictEqual(user.email, 'andre.node@student.itera.ac.id');
  assert.strictEqual(user.password_hash, undefined);
});

test('TC-02: respon gagal login harus menggunakan pesan galat generik', async () => {
  const { token, cookieHeader } = await getCsrf();

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      email: 'tidakada@student.itera.ac.id',
      password: 'PasswordSalah123'
    })
  });

  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.detail, 'Email atau kata sandi tidak valid.');
});

test('TC-03: rate limiting memblokir percobaan login ke-6 (HTTP 429)', async () => {
  const { token, cookieHeader } = await getCsrf();
  const attackerIp = '198.51.100.1';

  for (let i = 0; i < 5; i++) {
    await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        'x-forwarded-for': attackerIp,
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        email: 'attacker@student.itera.ac.id',
        password: 'SalahPassword123'
      })
    });
  }

  const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'x-forwarded-for': attackerIp,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      email: 'attacker@student.itera.ac.id',
      password: 'SalahPassword123'
    })
  });

  assert.strictEqual(blockedRes.status, 429);
  const data = await blockedRes.json();
  assert.ok(data.detail.includes('Terlalu banyak'));
});

test('TC-04: regenerasi ID sesi saat login dan invalidasi sesi saat logout', async () => {
  const { token, cookieHeader } = await getCsrf();

  await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      name: 'Tester Session',
      email: 'session.test@student.itera.ac.id',
      password: 'PasswordKuat123'
    })
  });

  const loginRes1 = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      email: 'session.test@student.itera.ac.id',
      password: 'PasswordKuat123'
    })
  });
  assert.strictEqual(loginRes1.status, 200);
  const data1 = await loginRes1.json();
  const session1 = data1.session_id;

  const loginRes2 = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': `${cookieHeader}; postera_session=${session1}`
    },
    body: JSON.stringify({
      email: 'session.test@student.itera.ac.id',
      password: 'PasswordKuat123'
    })
  });
  assert.strictEqual(loginRes2.status, 200);
  const data2 = await loginRes2.json();
  const session2 = data2.session_id;

  assert.notStrictEqual(session1, session2);

  const oldDbSession = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [session1]);
  assert.strictEqual(oldDbSession.rows.length, 0);

  const newDbSession = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [session2]);
  assert.strictEqual(newDbSession.rows.length, 1);

  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session2}`,
      'x-csrf-token': token,
      'Cookie': `${cookieHeader}; postera_session=${session2}`
    }
  });
  assert.strictEqual(logoutRes.status, 200);

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${session2}` }
  });
  assert.strictEqual(meRes.status, 401);
});

test('TC-05: penolakan HTTP 403 jika request mutasi dikirim tanpa token CSRF', async () => {
  const rejectedRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Tanpa CSRF',
      email: 'nocsrf@student.itera.ac.id',
      password: 'Password123'
    })
  });

  assert.strictEqual(rejectedRes.status, 403);
  const data = await rejectedRes.json();
  assert.ok(data.detail.toLowerCase().includes('csrf'));
});
