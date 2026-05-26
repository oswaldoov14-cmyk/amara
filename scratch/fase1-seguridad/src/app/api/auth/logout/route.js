/**
 * src/app/api/auth/logout/route.js — Logout con revocación de token
 *
 * Cambios respecto a la versión original:
 *   ✓ Extrae el jti del token antes de eliminar la cookie
 *   ✓ Añade el jti a la blocklist para que no pueda reutilizarse
 *   ✓ El token queda inválido incluso si alguien lo guardó externamente
 */

import { jwtVerify } from 'jose'
import { revokeToken } from '@/lib/blocklist'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

export async function POST(request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionMatch = cookieHeader.match(/session=([^;]+)/)
  const token = sessionMatch?.[1]

  // Intentar revocar el token si existe y es válido
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET)
      if (payload.jti && payload.exp) {
        await revokeToken(payload.jti, payload.exp)
      }
    } catch {
      // Token ya inválido o expirado — no pasa nada, igual borramos la cookie
    }
  }

  // Expirar la cookie
  const expiredCookie = [
    'session=',
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': expiredCookie,
    },
  })
}
