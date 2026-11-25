import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../database.js';
import {
  isValidArticleImageUrl,
  parsePositiveIntId,
  validateArticleIdParam,
  validateCreateArticleInput,
  validatePatchArticleInput
} from '../middleware/validation.js';
import { requireAdmin } from '../middleware/authorization.js';
import { csrfTokenHandler, verifyCsrfToken } from '../middleware/csrf.js';
import {
  createArticle,
  deleteArticle,
  getPublicArticleById,
  listAdminArticles,
  listPublicArticles,
  updateArticle
} from '../controllers/articleController.js';

afterEach(() => {
  mock.restoreAll();
});

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value) {
      this.cookies[name] = value;
      return this;
    }
  };
}

function runMiddleware(mw, req) {
  const res = createMockRes();
  let nextCalled = false;
  mw(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled, req };
}

test('TC-06: Admin dapat membuat, membaca, mengubah, dan menghapus artikel valid', async () => {
  const fakeClient = {
    async query(sql, params = []) {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.startsWith('INSERT INTO articles')) {
        return {
          rows: [{
            id: 77,
            user_id: params[0],
            title: params[1],
            description: params[2],
            image_url: params[3],
            category: params[4],
            status: params[5]
          }]
        };
      }
      if (sql.startsWith('SELECT id, title, status FROM articles')) {
        return { rows: [{ id: 77, title: 'Judul Valid Kampus', status: 'published' }] };
      }
      if (sql.startsWith('SELECT id, title FROM articles')) {
        return { rows: [{ id: 77, title: 'Judul Diperbarui' }] };
      }
      if (sql.startsWith('UPDATE articles')) {
        return { rows: [{ id: 77, title: params[0], status: params[1] || 'archived' }] };
      }
      if (sql.startsWith('INSERT INTO audit_logs')) {
        return { rows: [{ id: 1 }] };
      }
      return { rows: [] };
    },
    release() {}
  };
  mock.method(pool, 'connect', async () => fakeClient);

  const adminUser = { id: 1, email: 'admin@postera.ac.id', role: 'admin', is_active: true };

  // Create
  const createReq = {
    user: adminUser,
    ip: '127.0.0.1',
    headers: {},
    body: {
      title: 'Judul Valid Kampus',
      description: 'Isi artikel valid.',
      category: 'akademik',
      status: 'published',
      image_url: 'https://example.com/cover.jpg'
    }
  };
  const valCreate = runMiddleware(validateCreateArticleInput, createReq);
  assert.strictEqual(valCreate.nextCalled, true);

  const createRes = createMockRes();
  await createArticle(createReq, createRes);
  assert.strictEqual(createRes.statusCode, 201);
  assert.strictEqual(createRes.body.id, 77);

  // Update
  const updateReq = {
    user: adminUser,
    ip: '127.0.0.1',
    headers: {},
    validatedArticleId: 77,
    validatedArticle: { title: 'Judul Diperbarui', status: 'archived' }
  };
  const updateRes = createMockRes();
  await updateArticle(updateReq, updateRes);
  assert.strictEqual(updateRes.statusCode, 200);
  assert.strictEqual(updateRes.body.title, 'Judul Diperbarui');

  // Delete
  const deleteRes = createMockRes();
  await deleteArticle(
    { user: adminUser, ip: '127.0.0.1', headers: {}, validatedArticleId: 77 },
    deleteRes
  );
  assert.strictEqual(deleteRes.statusCode, 200);
});

test('TC-07: Batas panjang judul artikel (kosong, <3, >150 karakter) ditolak HTTP 422', () => {
  for (const badTitle of ['', '   ', 'ab', 'A'.repeat(151)]) {
    const check = runMiddleware(validateCreateArticleInput, {
      body: { title: badTitle, description: 'Isi valid' }
    });
    assert.strictEqual(check.nextCalled, false);
    assert.strictEqual(check.res.statusCode, 422);
  }

  const boundaryMin = runMiddleware(validateCreateArticleInput, {
    body: { title: 'ABC', description: 'Isi valid' }
  });
  assert.strictEqual(boundaryMin.nextCalled, true);

  const boundaryMax = runMiddleware(validateCreateArticleInput, {
    body: { title: 'A'.repeat(150), description: 'Isi valid' }
  });
  assert.strictEqual(boundaryMax.nextCalled, true);

  const emptyPatch = runMiddleware(validatePatchArticleInput, { body: {} });
  assert.strictEqual(emptyPatch.nextCalled, false);
  assert.strictEqual(emptyPatch.res.statusCode, 422);

  assert.strictEqual(isValidArticleImageUrl('javascript:alert(1)'), false);
});

test('TC-08: User Biasa (mahasiswa) ditolak HTTP 403 saat mengakses CRUD artikel, & CSRF wajib valid', () => {
  const noUser = runMiddleware(requireAdmin, {});
  assert.strictEqual(noUser.res.statusCode, 401);

  const student = runMiddleware(requireAdmin, {
    user: { id: 2, role: 'mahasiswa', is_active: true }
  });
  assert.strictEqual(student.nextCalled, false);
  assert.strictEqual(student.res.statusCode, 403);
  assert.strictEqual(student.res.body.detail, 'Akses ditolak.');

  const noCsrf = runMiddleware(verifyCsrfToken, { method: 'POST', headers: {}, cookies: {} });
  assert.strictEqual(noCsrf.nextCalled, false);
  assert.strictEqual(noCsrf.res.statusCode, 403);

  const csrfRes = createMockRes();
  csrfTokenHandler({ cookies: {} }, csrfRes);
  const token = csrfRes.body.csrfToken;
  const validCsrf = runMiddleware(verifyCsrfToken, {
    method: 'DELETE',
    headers: { 'x-csrf-token': token },
    cookies: { postera_csrf: token }
  });
  assert.strictEqual(validCsrf.nextCalled, true);
});

test("TC-09: Pencarian artikel dengan payload ' OR 1=1 -- aman (parameterized query) & ID SQLi ditolak 422", async () => {
  const queries = [];
  mock.method(pool, 'query', async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT COUNT(*)')) {
      return { rows: [{ count: '0' }] };
    }
    return { rows: [] };
  });

  const payload = "' OR 1=1 --";
  const reqSearch = { query: { search: payload, page: '1', limit: '9' } };
  const resSearch = createMockRes();
  await listPublicArticles(reqSearch, resSearch);

  assert.strictEqual(resSearch.statusCode, 200);
  assert.strictEqual(resSearch.body.total, 0);
  assert.ok(queries[0].sql.includes("a.status = 'published'"));
  assert.ok(!queries[0].sql.includes('OR 1=1'));
  assert.ok(queries[0].params.includes(`%${payload.toLowerCase()}%`));

  const badIdCheck = runMiddleware(validateArticleIdParam, { params: { id: "1' OR '1'='1" } });
  assert.strictEqual(badIdCheck.nextCalled, false);
  assert.strictEqual(badIdCheck.res.statusCode, 422);
  assert.strictEqual(parsePositiveIntId("1; DROP TABLE articles"), null);

  mock.restoreAll();
  mock.method(pool, 'query', async (sql, params) => {
    assert.ok(sql.includes("AND a.status = 'published'"));
    assert.deepStrictEqual(params, [999]);
    return { rows: [] };
  });
  const resDetail = createMockRes();
  await getPublicArticleById({ validatedArticleId: 999 }, resDetail);
  assert.strictEqual(resDetail.statusCode, 404);
});

test('TC-10: Aksi CREATE, UPDATE, dan DELETE artikel oleh Admin tercatat di tabel audit_logs', async () => {
  const executed = [];
  const fakeClient = {
    async query(sql, params = []) {
      executed.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.startsWith('INSERT INTO articles')) {
        return {
          rows: [{
            id: 88,
            user_id: params[0],
            title: params[1],
            description: params[2],
            image_url: params[3],
            category: params[4],
            status: params[5]
          }]
        };
      }
      if (sql.startsWith('SELECT id, title, status FROM articles')) {
        return { rows: [{ id: 88, title: 'Artikel Audit', status: 'published' }] };
      }
      if (sql.startsWith('SELECT id, title FROM articles')) {
        return { rows: [{ id: 88, title: 'Artikel Audit Revisi' }] };
      }
      if (sql.startsWith('UPDATE articles')) {
        return { rows: [{ id: 88, title: params[0], status: params[1] || 'archived' }] };
      }
      if (sql.startsWith('INSERT INTO audit_logs')) {
        return { rows: [{ id: 1, action: params[1], entity_type: params[2], entity_id: params[3] }] };
      }
      return { rows: [] };
    },
    release() {}
  };
  mock.method(pool, 'connect', async () => fakeClient);

  const adminUser = { id: 1, email: 'admin@postera.ac.id', role: 'admin' };

  await createArticle(
    {
      user: adminUser,
      ip: '127.0.0.1',
      headers: {},
      validatedArticle: {
        title: 'Artikel Audit',
        description: 'Konten',
        image_url: 'https://example.com/img.jpg',
        category: 'umum',
        status: 'published'
      }
    },
    createMockRes()
  );
  const createAudit = executed.find((q) => q.sql.includes('INSERT INTO audit_logs') && q.params[1] === 'CREATE');
  assert.ok(createAudit, 'Aksi CREATE wajib tercatat di audit_logs');
  assert.strictEqual(createAudit.params[2], 'articles');
  assert.strictEqual(createAudit.params[3], 88);

  executed.length = 0;
  await updateArticle(
    {
      user: adminUser,
      ip: '127.0.0.1',
      headers: {},
      validatedArticleId: 88,
      validatedArticle: { title: 'Artikel Audit Revisi', status: 'archived' }
    },
    createMockRes()
  );
  const updateAudit = executed.find((q) => q.sql.includes('INSERT INTO audit_logs') && q.params[1] === 'UPDATE');
  assert.ok(updateAudit, 'Aksi UPDATE wajib tercatat di audit_logs');
  assert.strictEqual(updateAudit.params[2], 'articles');
  assert.strictEqual(updateAudit.params[3], 88);

  executed.length = 0;
  await deleteArticle(
    { user: adminUser, ip: '127.0.0.1', headers: {}, validatedArticleId: 88 },
    createMockRes()
  );
  const deleteAudit = executed.find((q) => q.sql.includes('INSERT INTO audit_logs') && q.params[1] === 'DELETE');
  assert.ok(deleteAudit, 'Aksi DELETE wajib tercatat di audit_logs');
  assert.strictEqual(deleteAudit.params[2], 'articles');
  assert.strictEqual(deleteAudit.params[3], 88);
});

test('Admin listAdminArticles mengizinkan filter status termasuk archived', async () => {
  const queries = [];
  mock.method(pool, 'query', async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: '1' }] };
    return { rows: [{ id: 14, title: 'Arsip UTS', status: 'archived' }] };
  });

  const res = createMockRes();
  await listAdminArticles({ query: { status: 'archived' } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.articles[0].status, 'archived');
  assert.ok(queries[0].params.includes('archived'));
});
