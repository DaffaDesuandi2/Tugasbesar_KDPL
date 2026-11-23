import { Router } from 'express';
import { pool } from './database.js';
import { authenticateUser } from './auth.js';

export const articleRouter = Router();

articleRouter.get('/', async (req, res) => {
  const { category, search, page = 1, limit = 9 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  const conditions = ["a.status = 'published'"];
  const params = [];

  if (category && category !== 'semua') {
    params.push(category);
    conditions.push(`a.category = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(a.title) LIKE $${params.length} OR LOWER(a.description) LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countQuery = `SELECT COUNT(*) FROM articles a ${whereClause}`;
    const totalRes = await pool.query(countQuery, params);
    const total = parseInt(totalRes.rows[0].count, 10);

    params.push(parseInt(limit, 10));
    params.push(offset);

    const listQuery = `
      SELECT a.id, a.user_id, a.title, a.description, a.image_url, a.category, a.status, a.created_at,
             u.name AS author_name,
             COUNT(ac.id)::int AS comments_count
      FROM articles a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN article_comments ac ON a.id = ac.article_id
      ${whereClause}
      GROUP BY a.id, u.name
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(listQuery, params);

    return res.status(200).json({
      articles: result.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10))
    });
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal memuat daftar artikel.' });
  }
});

articleRouter.get('/user/my-articles', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.title, a.description, a.image_url, a.category, a.status, a.created_at,
              COUNT(ac.id)::int AS comments_count
       FROM articles a
       LEFT JOIN article_comments ac ON a.id = ac.article_id
       WHERE a.user_id = $1
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal mengambil artikel pengguna.' });
  }
});

articleRouter.get('/user/my-comments', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.article_id, c.content, c.created_at,
              a.title AS article_title
       FROM article_comments c
       JOIN articles a ON c.article_id = a.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal mengambil komentar pengguna.' });
  }
});

articleRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const articleRes = await pool.query(
      `SELECT a.id, a.user_id, a.title, a.description, a.image_url, a.category, a.status, a.created_at,
              u.name AS author_name
       FROM articles a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (articleRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }

    const commentsRes = await pool.query(
      `SELECT c.id, c.user_id, c.content, c.created_at,
              u.name AS author_name
       FROM article_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.article_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    return res.status(200).json({
      article: articleRes.rows[0],
      comments: commentsRes.rows
    });
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal memuat detail artikel.' });
  }
});

articleRouter.post('/', authenticateUser, async (req, res) => {
  const { title, description, category = 'umum', image_url } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(400).json({ detail: 'Judul artikel minimal 3 karakter.' });
  }

  const finalImageUrl = image_url && typeof image_url === 'string' && image_url.trim()
    ? image_url.trim()
    : 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800';

  try {
    const result = await pool.query(
      `INSERT INTO articles (user_id, title, description, image_url, category, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'published', NOW(), NOW())
       RETURNING *`,
      [req.user.id, title.trim(), (description || '').trim(), finalImageUrl, category]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal membuat artikel.' });
  }
});

articleRouter.post('/:id/comments', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body || {};

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ detail: 'Isi komentar tidak boleh kosong.' });
  }

  try {
    const articleCheck = await pool.query('SELECT id FROM articles WHERE id = $1', [id]);
    if (articleCheck.rows.length === 0) {
      return res.status(404).json({ detail: 'Artikel tidak ditemukan.' });
    }

    const insertRes = await pool.query(
      `INSERT INTO article_comments (user_id, article_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, user_id, article_id, content, created_at`,
      [req.user.id, id, content.trim()]
    );

    const comment = insertRes.rows[0];
    comment.author_name = req.user.name;

    return res.status(201).json(comment);
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal menambahkan komentar.' });
  }
});

articleRouter.put('/comments/:commentId', authenticateUser, async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body || {};

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ detail: 'Isi komentar tidak boleh kosong.' });
  }

  try {
    const checkRes = await pool.query('SELECT user_id FROM article_comments WHERE id = $1', [commentId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Komentar tidak ditemukan.' });
    }

    if (checkRes.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Anda tidak memiliki hak untuk mengubah komentar ini.' });
    }

    const updateRes = await pool.query(
      `UPDATE article_comments
       SET content = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, article_id, content, updated_at`,
      [content.trim(), commentId]
    );

    return res.status(200).json(updateRes.rows[0]);
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal mengubah komentar.' });
  }
});

articleRouter.delete('/comments/:commentId', authenticateUser, async (req, res) => {
  const { commentId } = req.params;

  try {
    const checkRes = await pool.query('SELECT user_id FROM article_comments WHERE id = $1', [commentId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ detail: 'Komentar tidak ditemukan.' });
    }

    if (checkRes.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'Anda tidak memiliki hak untuk menghapus komentar ini.' });
    }

    await pool.query('DELETE FROM article_comments WHERE id = $1', [commentId]);
    return res.status(200).json({ message: 'Komentar berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal menghapus komentar.' });
  }
});
