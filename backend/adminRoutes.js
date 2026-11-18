import { Router } from 'express';
import { authenticateUser } from './auth.js';
import { requireAdmin } from './middleware/authorization.js';

export const adminRouter = Router();

// Seluruh route di router ini terproteksi; jangan letakkan route publik di sini.
adminRouter.use(authenticateUser, requireAdmin);

// Endpoint sementara untuk membuktikan kontrol akses pada demo Minggu 2.
// Arsa dapat menggantinya dengan controller daftar user sungguhan.
adminRouter.get('/users', (req, res) => {
  return res.status(200).json({
    message: 'Akses Admin diizinkan.',
    user: { id: req.user.id, role: req.user.role }
  });
});
