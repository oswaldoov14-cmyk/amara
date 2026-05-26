/**
 * Blocklist de tokens JWT — usa la misma SQLite/Turso DB del proyecto
 */

import { getDb } from './db'

/**
 * Revoca un token agregando su jti a la blocklist
 * @param {string} jti       - El claim "jti" extraído del JWT
 * @param {number} expiresAt - Unix timestamp en segundos de expiración del token
 */
export async function revokeToken(jti, expiresAt) {
  const db = getDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO token_blocklist (jti, expires_at) VALUES (?, ?)`,
    args: [jti, expiresAt],
  })
}

/**
 * Verifica si un token ha sido revocado
 * @param {string} jti
 * @returns {Promise<boolean>} true si está bloqueado
 */
export async function isTokenRevoked(jti) {
  const now = Math.floor(Date.now() / 1000)
  const db = getDb();

  try {
    // Aprovechar la consulta para limpiar tokens ya expirados (housekeeping)
    await db.execute({
      sql: `DELETE FROM token_blocklist WHERE expires_at < ?`,
      args: [now],
    })

    const result = await db.execute({
      sql: `SELECT 1 FROM token_blocklist WHERE jti = ?`,
      args: [jti],
    })

    return result.rows.length > 0
  } catch (error) {
    console.error("isTokenRevoked error:", error);
    return false;
  }
}
