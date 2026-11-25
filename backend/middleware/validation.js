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

export const ALLOWED_ARTICLE_STATUSES = ['published', 'archived', 'rejected'];
export const DEFAULT_ARTICLE_IMAGE_URL =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800';
const MAX_DATA_URL_LENGTH = 3 * 1024 * 1024;
const DATA_IMAGE_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Memastikan nilai ID berupa integer positif yang aman.
 */
export function parsePositiveIntId(rawId) {
  if (typeof rawId === 'number') {
    return Number.isSafeInteger(rawId) && rawId > 0 ? rawId : null;
  }
  if (typeof rawId !== 'string') {
    return null;
  }
  const trimmed = rawId.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Memvalidasi parameter :id pada rute artikel agar berupa integer positif.
 */
export function validateArticleIdParam(req, res, next) {
  const articleId = parsePositiveIntId(req.params?.id);
  if (!articleId) {
    return res.status(422).json({
      detail: 'Validasi gagal: Parameter ID artikel harus berupa integer positif.'
    });
  }
  req.validatedArticleId = articleId;
  return next();
}

/**
 * Memvalidasi URL gambar agar hanya menerima http(s) atau data URI gambar JPG/PNG/WebP.
 */
export function isValidArticleImageUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (DATA_IMAGE_REGEX.test(trimmed)) {
    return trimmed.length <= MAX_DATA_URL_LENGTH;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Factory middleware validasi input artikel untuk operasi create/PUT (penuh) dan PATCH (parsial).
 */
export function validateArticleInput({ partial = false } = {}) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(422).json({
        detail: 'Validasi gagal: Payload artikel tidak valid.'
      });
    }

    const { title, description, category, status, image_url } = body;
    const validated = {};

    if (!partial || title !== undefined) {
      if (typeof title !== 'string') {
        return res.status(422).json({
          detail: 'Validasi gagal: Judul artikel wajib berupa teks.'
        });
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
        return res.status(422).json({
          detail: 'Validasi gagal: Judul artikel harus terdiri dari 3 hingga 150 karakter.'
        });
      }
      validated.title = trimmedTitle;
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(422).json({
          detail: 'Validasi gagal: Isi artikel harus berupa teks.'
        });
      }
      validated.description = description.trim();
    } else if (!partial) {
      validated.description = '';
    }

    if (category !== undefined) {
      if (typeof category !== 'string') {
        return res.status(422).json({
          detail: 'Validasi gagal: Kategori artikel harus berupa teks.'
        });
      }
      const trimmedCategory = category.trim().toLowerCase();
      if (trimmedCategory.length === 0 || trimmedCategory.length > 50) {
        return res.status(422).json({
          detail: 'Validasi gagal: Kategori artikel harus terdiri dari 1 hingga 50 karakter.'
        });
      }
      validated.category = trimmedCategory;
    } else if (!partial) {
      validated.category = 'umum';
    }

    if (status !== undefined) {
      if (typeof status !== 'string' || !ALLOWED_ARTICLE_STATUSES.includes(status.trim())) {
        return res.status(422).json({
          detail: 'Validasi gagal: Status artikel harus bernilai published, archived, atau rejected.'
        });
      }
      validated.status = status.trim();
    } else if (!partial) {
      validated.status = 'published';
    }

    if (image_url !== undefined && image_url !== null) {
      if (typeof image_url !== 'string') {
        return res.status(422).json({
          detail: 'Validasi gagal: Gambar sampul artikel harus berupa string URL.'
        });
      }
      const trimmedImageUrl = image_url.trim();
      if (trimmedImageUrl === '') {
        if (!partial) {
          validated.image_url = DEFAULT_ARTICLE_IMAGE_URL;
        } else {
          return res.status(422).json({
            detail: 'Validasi gagal: Gambar sampul artikel tidak boleh kosong.'
          });
        }
      } else if (!isValidArticleImageUrl(trimmedImageUrl)) {
        return res.status(422).json({
          detail: 'Validasi gagal: Tautan gambar sampul harus berupa URL http(s) atau gambar JPG/PNG/WebP yang valid.'
        });
      } else {
        validated.image_url = trimmedImageUrl;
      }
    } else if (!partial) {
      validated.image_url = DEFAULT_ARTICLE_IMAGE_URL;
    }

    if (partial && Object.keys(validated).length === 0) {
      return res.status(422).json({
        detail: 'Validasi gagal: Minimal satu field artikel harus dikirim untuk diperbarui.'
      });
    }

    req.validatedArticle = validated;
    return next();
  };
}

export const validateCreateArticleInput = validateArticleInput({ partial: false });
export const validatePatchArticleInput = validateArticleInput({ partial: true });
