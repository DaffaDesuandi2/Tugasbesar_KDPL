import { Router } from 'express';
import { authenticateUser } from './auth.js';
import { requireAdmin } from './middleware/authorization.js';
import { pool } from './database.js';

export const adminRouter = Router();

// Seluruh route di adminRouter diproteksi (Deny by default); jangan letakkan route publik di sini.
adminRouter.use(authenticateUser, requireAdmin);

/**
 * GET /api/admin/users
 * Mengambil daftar seluruh pengguna untuk kebutuhan manajemen Admin (Fitur F-7).
 * 
 * Kontrol Keamanan (Secure Design & SDL):
 * 1. Autentikasi sesi terverifikasi (authenticateUser) -> Mencegah unauthenticated access (HTTP 401).
 * 2. Otorisasi role Admin di sisi server (requireAdmin) -> Deny by Default, mencegah Broken Access Control (HTTP 403).
 * 3. Safe Projection -> Hanya memilih field yang aman, mengecualikan password_hash demi mencegah Information Disclosure (CWE-200 / SR-AUTH-01).
 */
adminRouter.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    return res.status(200).json({
      message: 'Akses Admin diizinkan. Daftar pengguna berhasil dimuat.',
      admin: { id: req.user.id, role: req.user.role }, // Identitas admin yang sedang login
      total: result.rows.length,
      users: result.rows // Daftar seluruh pengguna dari database
    });
  } catch (error) {
    console.error('Gagal mengambil daftar pengguna:', error);
    return res.status(500).json({ detail: 'Terjadi kesalahan pada server saat mengambil data pengguna.' });
  }
});

/** 
 * PATCH /api/admin/users/:id/status
 * Mengubah status keaktifan akun pengguna (Fitur F-7)
 * 
 * Kontrol keamanan:
 * 1. Otorisasi  Server-Side (requireAdmin): Memastikan hanya admin yang bisa mengubah status akun (Deny by Default)
 * 2. Validasi parameter ID: Mencegah SQL injection dan tipe input salah (wajib integer positif)
 * 3. Validasi Body is_active: Mencegah type confusion/parameter tampering (wajib boolean true/false)
 * 4. Self-Deactivaion Prevention: Mencegah Admin menonaktifkan dirinya sendiri (Mencegah DoS atau system lockout)
 * 5. Safe Projection: Mengembalikan data pengguna tanpa menampilkan password_hash (SR-AUTH-01 / CWE-200)
 * 6. Audit Logging: Mencatat aksi perubahan status akun ke tabel audit_logs untuk akuntabilitas (SR-AUD-01)
 */

adminRouter.patch('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  // 1. Validasi format ID: harus berupa angka integer positif
  const targetUserId = parseInt(id, 10);
  if (isNaN(targetUserId) || targetUserId <= 0) {
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
    // 6. Catat perubahan ke tabel audit_logs (SR-AUD-01)
    const logDetails = `Admin ${req.user.email} (ID: ${req.user.id}) mengubah status akun ${targetUser.email} (ID: ${targetUser.id}) dari ${targetUser.is_active} menjadi ${is_active}`;

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        req.user.id,
        'TOGGLE_USER_STATUS',
        'users',
        targetUserId,
        logDetails,
        req.ip || req.connection.remoteAddress || '127.0.0.1'
      ]
    );
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
      "SELECT COALESCE(SUM(failed_login_attempts), 0)::int AS count FROM users"
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

adminRouter.get('/articles', async (req, res) => {
  const { category, status, search, page = 1, limit = 10 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  const conditions = [];
  const params = [];

  if (category && category !== 'Semua') {
    params.push(category);
    conditions.push(`a.category = $${params.length}`);
  }

  if (status && status !== 'Semua') {
    params.push(status.toLowerCase());
    conditions.push(`a.status = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(a.title) LIKE $${params.length} OR LOWER(a.description) LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM articles a ${whereClause}`, params);
    const total = countRes.rows[0].total;

    params.push(parseInt(limit, 10));
    params.push(offset);

    const listQuery = `
      SELECT a.id, a.title, a.category, a.status, a.image_url,
             TO_CHAR(a.created_at, 'DD Mon YYYY') AS created_at,
             TO_CHAR(a.updated_at, 'DD Mon YYYY') AS updated_at,
             u.name AS author_name
      FROM articles a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const listRes = await pool.query(listQuery, params);

    return res.status(200).json({
      articles: listRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('Gagal mengambil daftar artikel admin:', error);
    return res.status(500).json({ detail: 'Gagal mengambil daftar artikel.' });
  }
});

adminRouter.get('/articles/:id', async (req, res) => {
  const { id } = req.params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId) || articleId <= 0) {
    return res.status(422).json({ detail: 'ID artikel tidak valid.' });
  }

  try {
    const result = await pool.query(
      `SELECT a.*, u.name AS author_name
       FROM articles a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [articleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Gagal mengambil detail artikel admin:', error);
    return res.status(500).json({ detail: 'Gagal mengambil detail artikel.' });
  }
});

adminRouter.post('/articles', async (req, res) => {
  const { title, description, category = 'Umum', status = 'published', image_url } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(422).json({ detail: 'Judul artikel wajib diisi minimal 3 karakter.' });
  }

  const finalImageUrl = image_url && typeof image_url === 'string' && image_url.trim()
    ? image_url.trim()
    : 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800';

  const validStatuses = ['published', 'archived', 'rejected'];
  const finalStatus = validStatuses.includes(status) ? status : 'published';

  try {
    const result = await pool.query(
      `INSERT INTO articles (user_id, title, description, image_url, category, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [req.user.id, title.trim(), (description || '').trim(), finalImageUrl, category, finalStatus]
    );

    const newArticle = result.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        req.user.id,
        'CREATE',
        'articles',
        newArticle.id,
        `Admin ${req.user.name} membuat artikel #${newArticle.id}: "${newArticle.title}"`,
        req.ip || req.connection.remoteAddress || '127.0.0.1'
      ]
    );

    return res.status(201).json({
      message: 'Artikel berhasil diterbitkan.',
      article: newArticle
    });
  } catch (error) {
    console.error('Gagal membuat artikel:', error);
    return res.status(500).json({ detail: 'Gagal membuat artikel.' });
  }
});

adminRouter.put('/articles/:id', async (req, res) => {
  const { id } = req.params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId) || articleId <= 0) {
    return res.status(422).json({ detail: 'ID artikel tidak valid.' });
  }

  const { title, description, category, status, image_url } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(422).json({ detail: 'Judul artikel wajib diisi minimal 3 karakter.' });
  }

  try {
    const checkRes = await pool.query('SELECT * FROM articles WHERE id = $1', [articleId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }

    const current = checkRes.rows[0];
    const finalCategory = category || current.category;
    const finalStatus = status || current.status;
    const finalImageUrl = image_url || current.image_url;

    const updateRes = await pool.query(
      `UPDATE articles
       SET title = $1, description = $2, category = $3, status = $4, image_url = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title.trim(), (description || '').trim(), finalCategory, finalStatus, finalImageUrl, articleId]
    );

    const updatedArticle = updateRes.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        req.user.id,
        'UPDATE',
        'articles',
        articleId,
        `Admin ${req.user.name} mengubah artikel #${articleId}: "${updatedArticle.title}"`,
        req.ip || req.connection.remoteAddress || '127.0.0.1'
      ]
    );

    return res.status(200).json({
      message: 'Artikel berhasil diperbarui.',
      article: updatedArticle
    });
  } catch (error) {
    console.error('Gagal memperbarui artikel:', error);
    return res.status(500).json({ detail: 'Gagal memperbarui artikel.' });
  }
});

adminRouter.delete('/articles/:id', async (req, res) => {
  const { id } = req.params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId) || articleId <= 0) {
    return res.status(422).json({ detail: 'ID artikel tidak valid.' });
  }

  try {
    const checkRes = await pool.query('SELECT title FROM articles WHERE id = $1', [articleId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }

    const articleTitle = checkRes.rows[0].title;
    await pool.query('DELETE FROM articles WHERE id = $1', [articleId]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        req.user.id,
        'DELETE',
        'articles',
        articleId,
        `Admin ${req.user.name} menghapus artikel #${articleId}: "${articleTitle}"`,
        req.ip || req.connection.remoteAddress || '127.0.0.1'
      ]
    );

    return res.status(200).json({ message: 'Artikel berhasil dihapus.' });
  } catch (error) {
    console.error('Gagal menghapus artikel:', error);
    return res.status(500).json({ detail: 'Gagal menghapus artikel.' });
  }
});

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
             u.name AS author_name,
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

adminRouter.delete('/comments/:id', async (req, res) => {
  const { id } = req.params;
  const commentId = parseInt(id, 10);

  if (isNaN(commentId) || commentId <= 0) {
    return res.status(422).json({ detail: 'ID komentar tidak valid.' });
  }

  try {
    const checkRes = await pool.query('SELECT content FROM article_comments WHERE id = $1', [commentId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Komentar tidak ditemukan.' });
    }

    await pool.query('DELETE FROM article_comments WHERE id = $1', [commentId]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        req.user.id,
        'DELETE',
        'article_comments',
        commentId,
        `Admin ${req.user.name} menghapus komentar #${commentId}`,
        req.ip || req.connection.remoteAddress || '127.0.0.1'
      ]
    );

    return res.status(200).json({ message: 'Komentar berhasil dihapus.' });
  } catch (error) {
    console.error('Gagal menghapus komentar admin:', error);
    return res.status(500).json({ detail: 'Gagal menghapus komentar.' });
  }
});

adminRouter.get('/audit-logs', async (req, res) => {
  const { action, entity_type, search, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  const conditions = [];
  const params = [];

  if (action && action !== 'Semua') {
    params.push(action);
    conditions.push(`l.action = $${params.length}`);
  }

  if (entity_type && entity_type !== 'Semua') {
    params.push(entity_type);
    conditions.push(`l.entity_type = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(l.details) LIKE $${params.length} OR LOWER(COALESCE(u.name, '')) LIKE $${params.length} OR l.ip_address LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM audit_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = countRes.rows[0].total;

    params.push(parseInt(limit, 10));
    params.push(offset);

    const listQuery = `
      SELECT l.id, l.action, l.entity_type, l.entity_id, l.details AS detail, l.ip_address,
             TO_CHAR(l.created_at, 'DD Mon YYYY HH24:MI:SS') AS created_at_wib,
             TO_CHAR(l.created_at, 'YYYY-MM-DD') AS iso_date,
             CONCAT(l.entity_type, ' #', l.entity_id) AS entity_label,
             u.name AS user_name
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const listRes = await pool.query(listQuery, params);

    return res.status(200).json({
      logs: listRes.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    console.error('Gagal mengambil audit logs:', error);
    return res.status(500).json({ detail: 'Gagal mengambil audit logs.' });
  }
});