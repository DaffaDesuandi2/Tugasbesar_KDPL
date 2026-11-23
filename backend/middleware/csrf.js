import crypto from 'crypto';

export const CSRF_COOKIE_NAME = 'postera_csrf';
const activeTokens = new Set();

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfTokenHandler(req, res) {
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  if (!token) {
    token = generateCsrfToken();
  }

  activeTokens.add(token);

  if (activeTokens.size > 10000) {
    const first = activeTokens.values().next().value;
    activeTokens.delete(first);
  }

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  return res.status(200).json({ csrfToken: token });
}

export function verifyCsrfToken(req, res, next) {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  const tokenFromHeader = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];

  const isValidHeader = tokenFromHeader && activeTokens.has(tokenFromHeader);
  const isCookieMatch = tokenFromCookie && tokenFromHeader === tokenFromCookie;

  if (!tokenFromHeader || (!isValidHeader && !isCookieMatch)) {
    return res.status(403).json({
      detail: 'Akses ditolak: Token CSRF tidak valid atau tidak ditemukan.'
    });
  }

  next();
}
