import { Router } from 'express';
import { pool } from './database.js';
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
  getPublicArticleById,
  listPublicArticles,
  updateArticle
} from './controllers/articleController.js';

export const articleRouter = Router();

// Rute publik pembacaan dan pencarian artikel (hanya artikel published)
articleRouter.get('/', listPublicArticles);

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

articleRouter.get('/:id', validateArticleIdParam, getPublicArticleById);

// Rute CRUD Artikel Admin (Deny by default: wajib terautentikasi & role admin)
articleRouter.post(
  '/',
  authenticateUser,
  requireAdmin,
  validateCreateArticleInput,
  createArticle
);

articleRouter.put(
  '/:id',
  authenticateUser,
  requireAdmin,
  validateArticleIdParam,
  validateCreateArticleInput,
  updateArticle
);

articleRouter.patch(
  '/:id',
  authenticateUser,
  requireAdmin,
  validateArticleIdParam,
  validatePatchArticleInput,
  updateArticle
);

articleRouter.delete(
  '/:id',
  authenticateUser,
  requireAdmin,
  validateArticleIdParam,
  deleteArticle
);

articleRouter.post('/:id/comments', authenticateUser, validateArticleIdParam, async (req, res) => {
  const id = req.validatedArticleId;
  const { content } = req.body || {};

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ detail: 'Isi komentar tidak boleh kosong.' });
  }

  try {
    const articleCheck = await pool.query(
      "SELECT id FROM articles WHERE id = $1 AND status = 'published'",
      [id]
    );
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
  const commentId = parsePositiveIntId(req.params.commentId);
  if (!commentId) {
    return res.status(422).json({ detail: 'Parameter ID komentar tidak valid.' });
  }
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
  const commentId = parsePositiveIntId(req.params.commentId);
  if (!commentId) {
    return res.status(422).json({ detail: 'Parameter ID komentar tidak valid.' });
  }

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
