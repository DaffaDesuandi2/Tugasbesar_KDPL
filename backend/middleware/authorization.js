// Security Lead — pembatasan hak akses di server (deny by default).
// Jalankan setelah authenticateUser agar req.user selalu berasal dari sesi tervalidasi.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ detail: 'Autentikasi diperlukan.' });
    }
    if (req.user.is_active !== true || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Akses ditolak.' });
    }
    return next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireMahasiswa = requireRole('mahasiswa');
