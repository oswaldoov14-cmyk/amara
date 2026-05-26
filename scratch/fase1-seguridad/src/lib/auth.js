/**
 * src/lib/auth.js — Helper de autenticación actualizado
 *
 * Cambios respecto a la versión original:
 *   ✓ Verifica que el token no esté en la blocklist (usuario desactivado o logout manual)
 *   ✓ Verifica que el usuario siga activo en la base de datos
 *   ✓ Expone getSessionOrNull() para rutas que admiten usuarios anónimos
 *
 * USO EN API ROUTE:
 *   import { requireAuth, requireAdmin } from '@/lib/auth'
 *
 *   export async function GET(request) {
 *     const { user, error } = await requireAuth(request)
 *     if (error) return error
 *     // user.id, user.email, user.rol, user.nombre disponibles
 *   }
 */

import { jwtVerify } from 'jose'
import { createClient } from '@libsql/client'
import { isTokenRevoked } from '@/lib/blocklist'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const db = createClient({ url: 'file:asistencia.db' })

/**
 * Extrae y valida la sesión del request.
 * @returns {{ user: object } | { error: Response }}
 */
export async function requireAuth(request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionMatch = cookieHeader.match(/session=([^;]+)/)
  const token = sessionMatch?.[1]

  if (!token) {
    return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) }
  }

  let payload
  try {
    const verified = await jwtVerify(token, SECRET)
    payload = verified.payload
  } catch {
    return { error: Response.json({ error: 'Sesión inválida o expirada' }, { status: 401 }) }
  }

  // ── Verificar blocklist ───────────────────────────────────────────────────
  if (payload.jti) {
    const revoked = await isTokenRevoked(payload.jti)
    if (revoked) {
      return { error: Response.json({ error: 'Sesión revocada' }, { status: 401 }) }
    }
  }

  // ── Verificar que el usuario siga activo en la DB ─────────────────────────
  const result = await db.execute({
    sql: `SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ? LIMIT 1`,
    args: [payload.id],
  })

  const user = result.rows[0]

  if (!user || user.activo === 0) {
    return { error: Response.json({ error: 'Usuario inactivo o eliminado' }, { status: 401 }) }
  }

  return { user }
}

/**
 * Igual que requireAuth pero además valida que el rol sea 'admin'
 */
export async function requireAdmin(request) {
  const result = await requireAuth(request)
  if (result.error) return result

  if (result.user.rol !== 'admin') {
    return { error: Response.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return result
}

/**
 * Versión que no falla — retorna null si no hay sesión válida
 */
export async function getSessionOrNull(request) {
  const result = await requireAuth(request)
  return result.error ? null : result.user
}
