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