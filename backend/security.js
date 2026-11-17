import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

export const SESSION_COOKIE_NAME = 'postera_session';
export const SESSION_EXPIRE_HOURS = 24;

export const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(plainPassword, hashedPassword) {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch {
    return false;
  }
}

export function generateSessionId() {
  return crypto.randomBytes(32).toString('base64url');
}

export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'Password minimal 8 karakter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password harus mengandung huruf besar (A-Z)';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password harus mengandung huruf kecil (a-z)';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password harus mengandung angka (0-9)';
  }
  return null;
}

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      detail: 'Terlalu banyak percobaan login. Silakan coba beberapa saat lagi.'
    });
  }
});
