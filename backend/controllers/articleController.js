import { pool } from '../database.js';
import { getClientIp, recordAuditLog } from '../utils/auditLog.js';

const ALLOWED_UPDATE_FIELDS = ['title', 'description', 'category', 'status', 'image_url'];

function parsePagination(query = {}, defaultLimit = 9) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildArticleFilterClause({ status, category, search }, includeAllStatuses) {
  const conditions = [];
  const params = [];

  if (!includeAllStatuses) {
    conditions.push("a.status = 'published'");
  } else if (status && status !== 'all') {
    params.push(String(status).trim());
    conditions.push(`a.status = $${params.length}`);
  }

  if (category && String(category).trim().toLowerCase() !== 'semua') {
    params.push(String(category).trim().toLowerCase());
    conditions.push(`LOWER(a.category) = $${params.length}`);
  }

  if (search && typeof search === 'string' && search.trim()) {
    params.push(`%${search.trim().slice(0, 100).toLowerCase()}%`);
    conditions.push(
      `(LOWER(a.title) LIKE $${params.length} OR LOWER(COALESCE(a.description, '')) LIKE $${params.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

async function queryArticleList(req, res, { includeAllStatuses, defaultLimit }) {
  const { page, limit, offset } = parsePagination(req.query, defaultLimit);
  const { whereClause, params } = buildArticleFilterClause(req.query || {}, includeAllStatuses);

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM articles a ${whereClause}`,
      params
    );
    const total = Number.parseInt(countRes.rows[0].count, 10);

    const listParams = [...params, limit, offset];
    const limitIdx = listParams.length - 1;
    const offsetIdx = listParams.length;

    const result = await pool.query(
      `SELECT a.id, a.user_id, a.title, a.description, a.image_url, a.category, a.status,
              a.created_at, a.updated_at,
              u.name AS author_name,
              COUNT(ac.id)::int AS comments_count
       FROM articles a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN article_comments ac ON a.id = ac.article_id
       ${whereClause}
       GROUP BY a.id, u.name
       ORDER BY a.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams
    );

    return res.status(200).json({
      articles: result.rows,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    console.error('Gagal memuat daftar artikel:', error);
    return res.status(500).json({ detail: 'Gagal memuat daftar artikel.' });
  }
}

async function fetchArticleWithComments(articleId, { publishedOnly }) {
  const statusFilter = publishedOnly ? "AND a.status = 'published'" : '';
  const articleRes = await pool.query(
    `SELECT a.id, a.user_id, a.title, a.description, a.image_url, a.category, a.status,
            a.created_at, a.updated_at,
            u.name AS author_name
     FROM articles a
     JOIN users u ON a.user_id = u.id
     WHERE a.id = $1 ${statusFilter}`,
    [articleId]
  );

  if (articleRes.rows.length === 0) {
    return null;
  }

  const commentsRes = await pool.query(
    `SELECT c.id, c.user_id, c.content, c.created_at, c.updated_at,
            u.name AS author_name
     FROM article_comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.article_id = $1
     ORDER BY c.created_at ASC`,
    [articleId]
  );

  return {
    article: articleRes.rows[0],
    comments: commentsRes.rows
  };
}

export function listPublicArticles(req, res) {
  return queryArticleList(req, res, { includeAllStatuses: false, defaultLimit: 9 });
}

export function listAdminArticles(req, res) {
  return queryArticleList(req, res, { includeAllStatuses: true, defaultLimit: 50 });
}

export async function getPublicArticleById(req, res) {
  try {
    const data = await fetchArticleWithComments(req.validatedArticleId, { publishedOnly: true });
    if (!data) {
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Gagal memuat detail artikel:', error);
    return res.status(500).json({ detail: 'Gagal memuat detail artikel.' });
  }
}

export async function getAdminArticleById(req, res) {
  try {
    const data = await fetchArticleWithComments(req.validatedArticleId, { publishedOnly: false });
    if (!data) {
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Gagal memuat detail artikel admin:', error);
    return res.status(500).json({ detail: 'Gagal memuat detail artikel.' });
  }
}

export async function createArticle(req, res) {
  const { title, description, image_url, category, status } = req.validatedArticle;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertRes = await client.query(
      `INSERT INTO articles (user_id, title, description, image_url, category, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [req.user.id, title, description, image_url, category, status]
    );
    const createdArticle = insertRes.rows[0];

    await recordAuditLog(client, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'articles',
      entityId: createdArticle.id,
      details: `Admin ${req.user.email} (ID: ${req.user.id}) membuat artikel "${createdArticle.title}" (status: ${createdArticle.status})`,
      ipAddress: getClientIp(req)
    });

    await client.query('COMMIT');
    return res.status(201).json(createdArticle);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Abaikan error rollback agar error utama tetap ditangani
    }
    console.error('Gagal membuat artikel:', error);
    return res.status(500).json({ detail: 'Gagal membuat artikel.' });
  } finally {
    client.release();
  }
}

export async function updateArticle(req, res) {
  const articleId = req.validatedArticleId;
  const validated = req.validatedArticle;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      'SELECT id, title, status FROM articles WHERE id = $1',
      [articleId]
    );
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }
    const existingArticle = existingRes.rows[0];

    const setClauses = [];
    const params = [];
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(validated, field)) {
        params.push(validated[field]);
        setClauses.push(`${field} = $${params.length}`);
      }
    }
    setClauses.push('updated_at = NOW()');
    params.push(articleId);

    const updateRes = await client.query(
      `UPDATE articles
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );
    const updatedArticle = updateRes.rows[0];

    await recordAuditLog(client, {
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'articles',
      entityId: updatedArticle.id,
      details: `Admin ${req.user.email} (ID: ${req.user.id}) mengubah artikel "${existingArticle.title}" -> "${updatedArticle.title}" (status: ${updatedArticle.status})`,
      ipAddress: getClientIp(req)
    });

    await client.query('COMMIT');
    return res.status(200).json(updatedArticle);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Abaikan error rollback
    }
    console.error('Gagal memperbarui artikel:', error);
    return res.status(500).json({ detail: 'Gagal memperbarui artikel.' });
  } finally {
    client.release();
  }
}

export async function deleteArticle(req, res) {
  const articleId = req.validatedArticleId;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      'SELECT id, title FROM articles WHERE id = $1',
      [articleId]
    );
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }
    const deletedTitle = existingRes.rows[0].title;

    await client.query('DELETE FROM articles WHERE id = $1', [articleId]);

    await recordAuditLog(client, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'articles',
      entityId: articleId,
      details: `Admin ${req.user.email} (ID: ${req.user.id}) menghapus artikel "${deletedTitle}" (ID: ${articleId})`,
      ipAddress: getClientIp(req)
    });

    await client.query('COMMIT');
    return res.status(200).json({
      message: 'Artikel berhasil dihapus.',
      id: articleId
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Abaikan error rollback
    }
    console.error('Gagal menghapus artikel:', error);
    return res.status(500).json({ detail: 'Gagal menghapus artikel.' });
  } finally {
    client.release();
  }
}
