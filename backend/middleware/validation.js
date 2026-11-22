import { validatePasswordStrength } from '../security.js';

const EMAIL_CAMPUS_REGEX = /^[a-z0-9._%+-]+@(student\.)?itera\.ac\.id$/i;

export function validateRegisterInput(req, res, next) {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ detail: 'Nama wajib diisi minimal 2 karakter.' });
  }

  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail || !EMAIL_CAMPUS_REGEX.test(cleanEmail)) {
    return res.status(400).json({
      detail: 'Format email tidak valid. Gunakan email resmi sivitas akademika ITERA.'
    });
  }

  const pwdError = validatePasswordStrength(password);
  if (pwdError) {
    return res.status(400).json({ detail: pwdError });
  }

  req.validatedBody = {
    name: name.trim(),
    email: cleanEmail,
    password
  };

  next();
}

export function validateLoginInput(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ detail: 'Email dan kata sandi wajib diisi.' });
  }

  req.validatedBody = {
    email: email.toLowerCase().trim(),
    password
  };

  next();
}
