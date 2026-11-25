import { Router } from 'express';
import { authenticateUser } from './auth.js';
import { requireAdmin } from './middleware/authorization.js';
import {
  parsePositiveIntId,
  validateArticleIdParam,
  validateCreateArticleInput,
  validatePatchArticleInput
} from './middleware/validation.js';
import {
  createArticle,
  deleteArticle,
  getAdminArticleById,
  listAdminArticles,
  updateArticle
} from './controllers/articleController.js';
import { pool } from './database.js';
import { getClientIp, recordAuditLog } from './utils/auditLog.js';

export const adminRouter = Router();

adminRouter.use(authenticateUser, requireAdmin);

/**
 * Manajemen Artikel Admin (menampilkan seluruh status termasuk archived)
 * Audit log ditangani di dalam articleController.js
 */
adminRouter.get('/articles', listAdminArticles);
adminRouter.get('/articles/:id', validateArticleIdParam, getAdminArticleById);
adminRouter.post('/articles', validateCreateArticleInput, createArticle);
adminRouter.put('/articles/:id', validateArticleIdParam, validateCreateArticleInput, updateArticle);
adminRouter.patch('/articles/:id', validateArticleIdParam, validatePatchArticleInput, updateArticle);
adminRouter.delete('/articles/:id', validateArticleIdParam, deleteArticle);

/**
 * GET /api/admin/audit-logs
 * Membaca log aktivitas sistem secara read-only untuk halaman Audit Log Admin (SR-LOG-01).
 */
adminRouter.get('/audit-logs', async (req, res) => {
  const { action, entity_type, from, to, search, page = 1, limit = 50 } = req.query || {};
  const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));
  const offset = (parsedPage - 1) * parsedLimit;

  const conditions = [];
  const params = [];

  if (action && action !== 'Semua') {
    params.push(String(action).trim());
    conditions.push(`al.action = $${params.length}`);
  }

  if (entity_type && entity_type !== 'Semua') {
    params.push(String(entity_type).trim());
    conditions.push(`al.entity_type = $${params.length}`);
  }

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(String(from))) {
    params.push(String(from));
    conditions.push(`(al.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $${params.length}::date`);
  }

  if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(to))) {
    params.push(String(to));
    conditions.push(`(al.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $${params.length}::date`);
  }

  if (search && typeof search === 'string' && search.trim()) {
    params.push(`%${search.trim().slice(0, 100).toLowerCase()}%`);
    conditions.push(
      `(LOWER(COALESCE(u.name, '')) LIKE $${params.length} OR LOWER(COALESCE(al.ip_address, '')) LIKE $${params.length} OR LOWER(COALESCE(al.details, '')) LIKE $${params.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = Number.parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, parsedLimit, offset];
    const logsRes = await pool.query(
      `SELECT al.id, al.user_id, u.name AS user_name, al.action, al.entity_type, al.entity_id,
              al.details, al.details AS detail, al.ip_address, al.created_at,
              TO_CHAR(al.created_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI:SS') AS created_at_wib,
              TO_CHAR(al.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS iso_date,
              CONCAT(al.entity_type, ' #', al.entity_id) AS entity_label
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return res.status(200).json({
      logs: logsRes.rows,
      total,
      page: parsedPage,
      totalPages: Math.max(1, Math.ceil(total / parsedLimit))
    });
  } catch (error) {
    console.error('Gagal mengambil audit logs:', error);
    return res.status(500).json({ detail: 'Gagal memuat catatan audit log.' });
  }
});

/**
 * GET /api/admin/users
 * Mengambil daftar seluruh pengguna untuk kebutuhan manajemen Admin (Fitur F-7).
 */
adminRouter.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    return res.status(200).json({
      message: 'Akses Admin diizinkan. Daftar pengguna berhasil dimuat.',
      admin: { id: req.user.id, role: req.user.role },
      total: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error('Gagal mengambil daftar pengguna:', error);
    return res.status(500).json({ detail: 'Terjadi kesalahan pada server saat mengambil data pengguna.' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Mengubah status keaktifan akun pengguna (Fitur F-7)
 */
adminRouter.patch('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  // 1. Validasi format ID: harus berupa angka integer positif
  const targetUserId = parsePositiveIntId(id);
  if (!targetUserId) {
    return res.status(422).json({
      detail: 'Validasi gagal: Parameter ID pengguna harus berupa integer positif.'
    });
  }

  // 2. Validasi tipe data is_active harus bernilai boolean (true atau false)
  if (typeof is_active !== 'boolean') {
    return res.status(422).json({
      detail: 'Validasi gagal: Field is_active harus bertipe boolean (true atau false).'
    });
  }

  // 3. Pencegahan Self-Deactivation: Admin dilarang menonaktifkan dirinya sendiri
  if (req.user.id === targetUserId && is_active === false) {
    return res.status(400).json({
      detail: 'Operasi ditolak: Admin tidak diizinkan untuk menonaktifkan akunnya sendiri demi mencegah penguncian sistem (system lockout).'
    });
  }

  try {
    // 4. Periksa apakah pengguna target ada di database
    const userCheck = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [targetUserId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        detail: 'Pengguna dengan ID tersebut tidak ditemukan.'
      });
    }
    const targetUser = userCheck.rows[0];

    // 5. Update status keaktifan pengguna secara aman menggunakan parameterized query
    const updateRes = await pool.query(
      `UPDATE users
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, is_active, updated_at`,
      [is_active, targetUserId]
    );
    const updatedUser = updateRes.rows[0];

    // 6. Catat perubahan ke tabel audit_logs (SR-AUD-01 / SR-LOG-01)
    const action = is_active ? 'MENGAKTIFKAN' : 'MENONAKTIFKAN';
    const logDetails = `Admin ${req.user.email} (ID: ${req.user.id}) ${action} akun ${targetUser.email} (ID: ${targetUser.id})`;

    await recordAuditLog(pool, {
      userId: req.user.id,
      action: 'TOGGLE_USER_STATUS',
      entityType: 'users',
      entityId: targetUserId,
      details: logDetails,
      ipAddress: getClientIp(req)
    });

    return res.status(200).json({
      message: `Status akun pengguna berhasil diperbarui menjadi ${is_active ? 'Aktif' : 'Nonaktif'}.`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Gagal memperbarui status pengguna:', error);
    return res.status(500).json({
      detail: 'Terjadi kesalahan pada server saat memperbarui status pengguna.'
    });
  }
});

adminRouter.get('/dashboard-stats', async (req, res) => {
  try {
    const studentsRes = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'mahasiswa'");
    const articlesRes = await pool.query("SELECT COUNT(*)::int AS count FROM articles WHERE status = 'published'");
    const commentsRes = await pool.query('SELECT COUNT(*)::int AS count FROM article_comments');
    const failedLoginsRes = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM audit_logs
       WHERE action = 'LOGIN_FAILED'
         AND created_at >= NOW() - INTERVAL '24 hours'`
    );

    const recentArticlesRes = await pool.query(
      `SELECT id, title, status, image_url, TO_CHAR(updated_at, 'DD Mon YYYY') AS updated_at
       FROM articles
       ORDER BY updated_at DESC
       LIMIT 5`
    );

    const recentLogsRes = await pool.query(
      `SELECT id, action, details, TO_CHAR(created_at, 'HH24:MI') AS time
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 5`
    );

    return res.status(200).json({
      stats: {
        total_students: studentsRes.rows[0].count,
        published_articles: articlesRes.rows[0].count,
        total_comments: commentsRes.rows[0].count,
        failed_logins_24h: failedLoginsRes.rows[0].count
      },
      recent_articles: recentArticlesRes.rows,
      recent_logs: recentLogsRes.rows
    });
  } catch (error) {
    console.error('Gagal mengambil statistik dashboard:', error);
    return res.status(500).json({ detail: 'Gagal mengambil statistik dashboard.' });
  }
});

/**
 * GET /api/admin/comments
 * Mengambil daftar seluruh komentar untuk pemantauan (read-only) admin
 */
adminRouter.get('/comments', async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(c.content) LIKE $${params.length} OR LOWER(u.name) LIKE $${params.length} OR LOWER(a.title) LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM article_comments c
       JOIN users u ON c.user_id = u.id
       JOIN articles a ON c.article_id = a.id
       ${whereClause}`,
      params
    );
    const total = countRes.rows[0].total;

    params.push(parseInt(limit, 10));
    params.push(offset);

    const listQuery = `
      SELECT c.id, c.content, c.article_id,
             u.id AS author_id,
             u.name AS author_name,
             u.is_active AS author_is_active,
             a.title AS article_title,
             TO_CHAR(c.created_at, 'DD Mon YYYY') AS created_date,
             TO_CHAR(c.created_at, 'HH24:MI') AS created_time,
             (c.updated_at > c.created_at) AS is_edited
      FROM article_comments c
      JOIN users u ON c.user_id = u.id
      JOIN articles a ON c.article_id = a.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const listRes = await pool.query(listQuery, params);

    return res.status(200).json({
      comments: listRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('Gagal mengambil daftar komentar admin:', error);
    return res.status(500).json({ detail: 'Gagal mengambil daftar komentar.' });
  }
});