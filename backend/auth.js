import { Router } from 'express';
import crypto from 'crypto';
import { pool } from './database.js';
import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRE_HOURS,
  generateSessionId,
  getSessionCookieOptions,
  hashPassword,
  loginLimiter,
  verifyPassword
} from './security.js';
import { validateRegisterInput, validateLoginInput } from './middleware/validation.js';
import { csrfTokenHandler } from './middleware/csrf.js';
import { sendOtpEmail } from './mailer.js';

export const authRouter = Router();

authRouter.get('/csrf-token', csrfTokenHandler);

export function getSessionId(req) {
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  if (req.headers['x-session-id']) {
    return req.headers['x-session-id'];
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export async function authenticateUser(req, res, next) {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return res.status(401).json({ detail: 'Autentikasi diperlukan.' });
  }

  try {
    const sessionRes = await pool.query(
      'SELECT * FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ detail: 'Sesi tidak valid atau telah berakhir.' });
    }

    const session = sessionRes.rows[0];
    if (new Date(session.expires_at) < new Date()) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [session.id]);
      return res.status(401).json({ detail: 'Sesi telah kedaluwarsa.' });
    }

    const userRes = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [session.user_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ detail: 'Pengguna tidak ditemukan.' });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ detail: 'Akun Anda telah dinonaktifkan.' });
    }

    req.user = user;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    return res.status(500).json({ detail: 'Terjadi kesalahan pada server.' });
  }
}

authRouter.post('/send-otp', async (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = (email || '').toLowerCase().trim();
  const campusRegex = /^[a-z0-9._%+-]+@(student\.)?itera\.ac\.id$/i;

  if (!cleanEmail || !campusRegex.test(cleanEmail)) {
    return res.status(400).json({ detail: 'Format email tidak valid. Gunakan email resmi ITERA.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ detail: 'Email sudah terdaftar.' });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query('DELETE FROM otps WHERE email = $1', [cleanEmail]);
    await pool.query(
      'INSERT INTO otps (email, otp_code, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [cleanEmail, otp, expiresAt]
    );

    await sendOtpEmail(cleanEmail, otp);
    return res.status(200).json({ message: 'Kode OTP berhasil dikirim.' });
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal mengirim kode OTP.' });
  }
});

authRouter.post('/resend-otp', async (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = (email || '').toLowerCase().trim();

  if (!cleanEmail) {
    return res.status(400).json({ detail: 'Email wajib diisi.' });
  }

  try {
    const latestOtp = await pool.query(
      'SELECT created_at FROM otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [cleanEmail]
    );

    if (latestOtp.rows.length > 0) {
      const secondsSinceLast = (Date.now() - new Date(latestOtp.rows[0].created_at).getTime()) / 1000;
      if (secondsSinceLast < 30) {
        return res.status(429).json({ detail: 'Mohon tunggu 30 detik sebelum meminta OTP ulang.' });
      }
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query('DELETE FROM otps WHERE email = $1', [cleanEmail]);
    await pool.query(
      'INSERT INTO otps (email, otp_code, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [cleanEmail, otp, expiresAt]
    );

    await sendOtpEmail(cleanEmail, otp);
    return res.status(200).json({ message: 'Kode OTP baru berhasil dikirim.' });
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal mengirim ulang kode OTP.' });
  }
});

authRouter.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body || {};
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanOtp = (otp || '').trim();

  if (!cleanEmail || !cleanOtp) {
    return res.status(400).json({ detail: 'Email dan kode OTP wajib diisi.' });
  }

  try {
    const otpRes = await pool.query(
      'SELECT * FROM otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
      [cleanEmail]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ detail: 'Kode OTP tidak ditemukan atau telah kedaluwarsa.' });
    }

    const otpRow = otpRes.rows[0];
    if (new Date(otpRow.expires_at) < new Date()) {
      await pool.query('DELETE FROM otps WHERE id = $1', [otpRow.id]);
      return res.status(400).json({ detail: 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.' });
    }

    if (otpRow.otp_code !== cleanOtp) {
      await pool.query('UPDATE otps SET attempts = attempts + 1 WHERE id = $1', [otpRow.id]);
      if (otpRow.attempts + 1 >= 5) {
        await pool.query('DELETE FROM otps WHERE id = $1', [otpRow.id]);
        return res.status(400).json({ detail: 'Terlalu banyak percobaan salah. Silakan minta kode baru.' });
      }
      return res.status(400).json({ detail: 'Kode OTP salah.' });
    }

    await pool.query('DELETE FROM otps WHERE email = $1', [cleanEmail]);
    return res.status(200).json({ message: 'Verifikasi OTP berhasil.' });
  } catch (error) {
    return res.status(500).json({ detail: 'Terjadi kesalahan saat memverifikasi OTP.' });
  }
});

authRouter.post('/register', validateRegisterInput, async (req, res) => {
  const { name, email, password } = req.validatedBody;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ detail: 'Email sudah terdaftar.' });
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active, failed_login_attempts, created_at, updated_at)
       VALUES ($1, $2, $3, 'mahasiswa', true, 0, NOW(), NOW())
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, passwordHash]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal melakukan registrasi.' });
  }
});

authRouter.post('/login', loginLimiter, validateLoginInput, async (req, res) => {
  const { email, password } = req.validatedBody;

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ detail: 'Email atau kata sandi tidak valid.' });
    }

    const user = userRes.rows[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      await pool.query(
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
        [user.id]
      );
      return res.status(401).json({ detail: 'Email atau kata sandi tidak valid.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ detail: 'Akun Anda telah dinonaktifkan.' });
    }

    await pool.query('UPDATE users SET failed_login_attempts = 0 WHERE id = $1', [user.id]);

    const oldSessionId = getSessionId(req);
    if (oldSessionId) {
      await pool.query('DELETE FROM sessions WHERE session_id = $1', [oldSessionId]);
    }

    const newSessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRE_HOURS * 3600 * 1000);
    const clientIp = req.ip || req.connection?.remoteAddress || null;
    const userAgent = (req.headers['user-agent'] || '').slice(0, 255);

    await pool.query(
      `INSERT INTO sessions (session_id, user_id, ip_address, user_agent, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [newSessionId, user.id, clientIp, userAgent, expiresAt]
    );

    res.cookie(SESSION_COOKIE_NAME, newSessionId, getSessionCookieOptions());

    return res.status(200).json({
      message: 'Login berhasil.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at
      },
      session_id: newSessionId
    });
  } catch (error) {
    return res.status(500).json({ detail: 'Terjadi kesalahan saat login.' });
  }
});

authRouter.post('/logout', authenticateUser, async (req, res) => {
  try {
    if (req.sessionId) {
      await pool.query('DELETE FROM sessions WHERE session_id = $1', [req.sessionId]);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    return res.status(200).json({ message: 'Logout berhasil.' });
  } catch (error) {
    return res.status(500).json({ detail: 'Gagal logout.' });
  }
});

authRouter.get('/me', authenticateUser, (req, res) => {
  return res.status(200).json(req.user);
});
