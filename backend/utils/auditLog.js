/**
 * Helper terpusat untuk pencatatan aktivitas ke tabel audit_logs (SR-LOG-01).
 * Menggunakan parameterized query (SR-INP-02) dan mendukung pool maupun transaction client.
 */
export async function recordAuditLog(
  db,
  {
    userId = null,
    action,
    entityType,
    entityId = null,
    details = null,
    ipAddress = null
  }
) {
  const result = await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, user_id, action, entity_type, entity_id, details, ip_address, created_at`,
    [userId, action, entityType, entityId, details, ipAddress]
  );

  return result.rows[0];
}

/**
 * Mengambil alamat IP klien secara aman dengan batas panjang kolom VARCHAR(45).
 */
export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 45);
  }
  const rawIp =
    req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  return String(rawIp).slice(0, 45);
}
