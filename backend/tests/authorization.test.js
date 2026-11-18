import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireRole, requireAdmin, requireMahasiswa } from '../middleware/authorization.js';

function run(middleware, user) {
  const req = { user };
  let statusCode = null; let payload = null; let nextCalled = false;
  const res = {
    status(n) { statusCode = n; return this; },
    json(data) { payload = data; return this; }
  };
  middleware(req, res, () => { nextCalled = true; });
  return { statusCode, payload, nextCalled };
}

test('tanpa sesi -> 401', () => {
  assert.equal(run(requireAdmin, undefined).statusCode, 401);
});
test('mahasiswa ditolak dari Admin -> 403', () => {
  assert.equal(run(requireAdmin, { role: 'mahasiswa', is_active: true }).statusCode, 403);
});
test('admin aktif boleh akses Admin', () => {
  assert.equal(run(requireAdmin, { role: 'admin', is_active: true }).nextCalled, true);
});
test('admin nonaktif -> 403', () => {
  assert.equal(run(requireAdmin, { role: 'admin', is_active: false }).statusCode, 403);
});
test('role kosong atau tidak dikenal -> 403', () => {
  assert.equal(run(requireAdmin, { is_active: true }).statusCode, 403);
  assert.equal(run(requireAdmin, { role: 'superadmin', is_active: true }).statusCode, 403);
});
test('mahasiswa aktif boleh lewat middleware mahasiswa', () => {
  assert.equal(run(requireMahasiswa, { role: 'mahasiswa', is_active: true }).nextCalled, true);
});
test('admin tidak dapat melewati middleware mahasiswa', () => {
  assert.equal(run(requireMahasiswa, { role: 'admin', is_active: true }).statusCode, 403);
});
test('allowedRoles kosong -> selalu ditolak', () => {
  assert.equal(run(requireRole(), { role: 'admin', is_active: true }).statusCode, 403);
});
