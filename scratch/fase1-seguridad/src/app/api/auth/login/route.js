/**
 * src/app/api/auth/login/route.js — Endpoint de login reforzado
 *
 * Cambios respecto a la versión original:
 *   ✓ Validación con Zod (email/password bien formados)
 *   ✓ Rate limiting por email además de por IP (ya cubierto en middleware)
 *   ✓ Tiempo de respuesta constante (evita timing attacks)
 *   ✓ JWT con claim "jti" (ID único, necesario para revocación)
 *   ✓ Limpia el rate limit al lograr un login exitoso
 */

import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { createClient } from '@libsql/client'
import { loginSchema, validate } from '@/lib/validation'
import { checkRateLimit, clearRateLimit } from '@/lib/rateLimit'

const db = createClient({ url: 'file:asistencia.db' })
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

// Tiempo mínimo de respuesta en ms (previene timing attacks)
const MIN_RESPONSE_TIME = 800

export async function POST(request) {
  const start = Date.now()

  // ── 1. Validar body con Zod ───────────────────────────────────────────────
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 })
  }

  const { ok, data, response: errorResponse } = validate(loginSchema, body)
  if (!ok) return errorResponse

  const { email, password } = data

  // ── 2. Rate limiting adicional por email (complementa el del middleware) ──
  const { allowed, resetInSeconds } = checkRateLimit('login:email', email, 5, 15 * 60 * 1000)
  if (!allowed) {
    await delay(MIN_RESPONSE_TIME, start)
    return Response.json(
      { error: 'Cuenta temporalmente bloqueada. Intenta en ' + resetInSeconds + ' segundos.' },
      { status: 429 }
    )
  }

  // ── 3. Buscar usuario en la base de datos ─────────────────────────────────
  const result = await db.execute({
    sql: `SELECT id, nombre, email, password_hash, rol, activo
          FROM usuarios WHERE email = ? LIMIT 1`,
    args: [email],
  })

  const user = result.rows[0]

  // ── 4. Verificar contraseña (siempre tardamos el mismo tiempo) ───────────
  // Comparamos contra un hash falso si el usuario no existe,
  // para que la respuesta tarde lo mismo y no revele si el email existe.
  const hashToCompare = user?.password_hash ?? '$2b$10$invalidhashpaddingtomatchlength0000000000000'
  const passwordOk = await bcrypt.compare(password, hashToCompare)

  if (!user || !passwordOk || user.activo === 0) {
    await delay(MIN_RESPONSE_TIME, start)
    return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  // ── 5. Login exitoso: limpiar rate limit ──────────────────────────────────
  clearRateLimit('login:email', email)

  // ── 6. Firmar JWT con "jti" único (necesario para blocklist) ─────────────
  const jti = crypto.randomUUID()
  const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60 // 8 horas

  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET)

  await delay(MIN_RESPONSE_TIME, start)

  // ── 7. Devolver cookie segura ─────────────────────────────────────────────
  const cookieOptions = [
    `session=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${8 * 60 * 60}`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')

  return new Response(
    JSON.stringify({ ok: true, rol: user.rol }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieOptions,
      },
    }
  )
}

/** Espera hasta completar el tiempo mínimo de respuesta */
function delay(minMs, start) {
  const elapsed = Date.now() - start
  const remaining = minMs - elapsed
  return remaining > 0 ? new Promise((r) => setTimeout(r, remaining)) : Promise.resolve()
}
