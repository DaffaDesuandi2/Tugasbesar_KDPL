import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';
import { initDatabase, pool } from '../database.js';
import { hashPassword } from '../security.js';

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
  await pool.query('DELETE FROM audit_logs');
  await pool.query('DELETE FROM article_comments');
  await pool.query('DELETE FROM articles');
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM users');
});

async function createUserAndSession({ name, email, password, role = 'mahasiswa', isActive = true }) {
  const pwdHash = await hashPassword(password);
  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active, failed_login_attempts, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())
     RETURNING id, name, email, role, is_active`,
    [name, email, pwdHash, role, isActive]
  );
  const user = userRes.rows[0];
  const sessionId = `art_sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions (session_id, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [sessionId, user.id, expiresAt]
  );

  return { user, sessionId };
}

async function getCsrfToken() {
  const res = await fetch(`${baseUrl}/api/auth/csrf-token`);
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/postera_csrf=([^;]+)/);
  const token = data.csrfToken;
  const cookieHeader = match ? `postera_csrf=${match[1]}` : `postera_csrf=${token}`;
  return { token, cookieHeader };
}

test('TC-06 & TC-10: Admin membuat, mengedit (PUT/PATCH), menghapus artikel valid & tercatat di audit_logs', async () => {
  const { token, cookieHeader } = await getCsrfToken();
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin Artikel',
    email: 'admin.artikel@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin'
  });

  // CREATE (POST /api/articles)
  const createRes = await fetch(`${baseUrl}/api/articles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      title: 'Panduan Akademik Mahasiswa Baru',
      description: 'Isi panduan lengkap.',
      category: 'akademik',
      status: 'published',
      image_url: 'https://example.com/panduan.jpg'
    })
  });
  assert.strictEqual(createRes.status, 201);
  const created = await createRes.json();

  // READ & SEARCH PUBLIC (GET /articles & GET /articles/:id)
  const publicSearchRes = await fetch(`${baseUrl}/articles?search=Panduan&category=akademik`);
  assert.strictEqual(publicSearchRes.status, 200);
  const publicList = await publicSearchRes.json();
  assert.strictEqual(publicList.total, 1);

  const publicDetailRes = await fetch(`${baseUrl}/articles/${created.id}`);
  assert.strictEqual(publicDetailRes.status, 200);

  // UPDATE (PUT /api/articles/:id) -> archived
  const putRes = await fetch(`${baseUrl}/api/articles/${created.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      title: 'Panduan Akademik Revisi',
      description: 'Isi revisi.',
      category: 'akademik',
      status: 'archived',
      image_url: 'https://example.com/panduan-v2.jpg'
    })
  });
  assert.strictEqual(putRes.status, 200);

  // Artikel archived disembunyikan dari rute publik
  const hiddenPublicRes = await fetch(`${baseUrl}/articles/${created.id}`);
  assert.strictEqual(hiddenPublicRes.status, 404);

  // PATCH (/api/articles/:id) -> terbitkan ulang
  const patchRes = await fetch(`${baseUrl}/api/articles/${created.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({ status: 'published' })
  });
  assert.strictEqual(patchRes.status, 200);

  // DELETE (/api/articles/:id)
  const deleteRes = await fetch(`${baseUrl}/api/articles/${created.id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'x-csrf-token': token,
      'Cookie': cookieHeader
    }
  });
  assert.strictEqual(deleteRes.status, 200);

  // TC-10: Verifikasi audit_logs mencatat CREATE, UPDATE, DELETE
  const logsRes = await pool.query(
    `SELECT action, entity_type, entity_id FROM audit_logs WHERE entity_type = 'articles' AND entity_id = $1 ORDER BY id ASC`,
    [created.id]
  );
  assert.deepStrictEqual(logsRes.rows.map((r) => r.action), ['CREATE', 'UPDATE', 'UPDATE', 'DELETE']);
});

test('TC-07: Batas panjang judul (kosong atau >150 karakter) ditolak HTTP 422', async () => {
  const { token, cookieHeader } = await getCsrfToken();
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin Validator',
    email: 'admin.val@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin'
  });

  for (const invalidTitle of ['', 'Hi', 'X'.repeat(151)]) {
    const res = await fetch(`${baseUrl}/api/articles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminSessionId}`,
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        'Cookie': cookieHeader
      },
      body: JSON.stringify({ title: invalidTitle, description: 'Isi valid' })
    });
    assert.strictEqual(res.status, 422);
  }
});

test('TC-08: User Biasa ditolak HTTP 403 saat akses CRUD artikel & tanpa CSRF ditolak 403', async () => {
  const { token, cookieHeader } = await getCsrfToken();
  const { sessionId: studentSessionId } = await createUserAndSession({
    name: 'Mahasiswa Biasa',
    email: 'mhs.crud@student.itera.ac.id',
    password: 'StudentPassword123',
    role: 'mahasiswa'
  });
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin Pemilik',
    email: 'admin.own@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin'
  });

  const createdRes = await fetch(`${baseUrl}/api/articles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({ title: 'Artikel Uji RBAC', description: 'Konten' })
  });
  const created = await createdRes.json();

  // Tanpa CSRF -> 403
  const noCsrfRes = await fetch(`${baseUrl}/api/articles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: 'Tanpa CSRF' })
  });
  assert.strictEqual(noCsrfRes.status, 403);

  // Mahasiswa mencoba POST, PUT, PATCH, DELETE -> seluruhnya 403
  for (const [method, url, payload] of [
    ['POST', `${baseUrl}/api/articles`, { title: 'Judul Oleh Mahasiswa' }],
    ['PUT', `${baseUrl}/api/articles/${created.id}`, { title: 'Ubah Oleh Mahasiswa' }],
    ['PATCH', `${baseUrl}/api/articles/${created.id}`, { status: 'archived' }],
    ['DELETE', `${baseUrl}/api/articles/${created.id}`, null]
  ]) {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${studentSessionId}`,
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        'Cookie': cookieHeader
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    assert.strictEqual(res.status, 403);
  }
});

test("TC-09: Pencarian artikel dengan payload ' OR 1=1 -- aman (anti-SQLi)", async () => {
  const { token, cookieHeader } = await getCsrfToken();
  const { sessionId: adminSessionId } = await createUserAndSession({
    name: 'Admin Seed',
    email: 'admin.sqli@postera.ac.id',
    password: 'AdminPassword123',
    role: 'admin'
  });

  await fetch(`${baseUrl}/api/articles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSessionId}`,
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      title: 'Artikel Rahasia Terarsip',
      description: 'Tidak boleh bocor',
      status: 'archived'
    })
  });

  const payload = encodeURIComponent("' OR 1=1 --");
  const sqliSearchRes = await fetch(`${baseUrl}/articles?search=${payload}`);
  assert.strictEqual(sqliSearchRes.status, 200);
  const searchData = await sqliSearchRes.json();
  assert.strictEqual(searchData.total, 0);

  const sqliIdRes = await fetch(`${baseUrl}/articles/${encodeURIComponent("1' OR '1'='1")}`);
  assert.strictEqual(sqliIdRes.status, 422);
});
