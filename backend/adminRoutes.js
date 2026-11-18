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
