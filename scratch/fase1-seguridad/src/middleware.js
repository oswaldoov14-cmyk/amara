/**
 * src/middleware.js — Middleware global de seguridad
 *
 * Aplica a todas las rutas del proyecto automáticamente por Next.js.
 * Hace tres cosas:
 *   1. Agrega headers de seguridad HTTP a TODAS las respuestas
 *   2. Aplica rate limiting al endpoint de login
 *   3. Verifica que la cookie de sesión exista en rutas protegidas
 *      (la validación completa del JWT sigue en cada API Route)
 */

import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

// ─── Headers de seguridad ────────────────────────────────────────────────────
// Se agregan a TODAS las respuestas del sitio
const SECURITY_HEADERS = {
  // Evita que el navegador infiera el tipo de archivo (sniffing)
  'X-Content-Type-Options': 'nosniff',

  // Bloquea que el sitio se cargue dentro de un iframe (clickjacking)
  'X-Frame-Options': 'DENY',

  // Fuerza HTTPS por 1 año en navegadores que lo soporten
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

  // Política de referrer: no enviar info al cambiar de dominio
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Desactiva permisos de hardware no necesarios
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',

  // Content Security Policy básica
  // Ajusta según tus CDNs o fuentes externas que uses
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",   // unsafe-inline necesario para Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
}

// Rutas que requieren sesión activa (cookie presente)
const RUTAS_PROTEGIDAS = ['/empleado', '/admin']

// Rutas que NO deben procesarse (assets, Next.js internals)
const RUTAS_EXCLUIDAS = ['/_next', '/favicon', '/icons', '/manifest']

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Saltar rutas internas de Next.js
  if (RUTAS_EXCLUIDAS.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // 1. Aplicar headers de seguridad a todas las respuestas
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // 2. Rate limiting en el endpoint de login
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '0.0.0.0'

    const { allowed, remaining, resetInSeconds } = checkRateLimit(
      'login',
      ip,
      5,           // máximo 5 intentos
      15 * 60 * 1000  // ventana de 15 minutos
    )

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.',
          retry_after: resetInSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(resetInSeconds),
            'X-RateLimit-Remaining': '0',
            ...SECURITY_HEADERS,
          },
        }
      )
    }

    // Informar al cliente cuántos intentos quedan (útil para el frontend)
    response.headers.set('X-RateLimit-Remaining', String(remaining))
  }

  // 3. Verificar presencia de cookie de sesión en rutas protegidas
  if (RUTAS_PROTEGIDAS.some((r) => pathname.startsWith(r))) {
    const token = request.cookies.get('session')
    if (!token) {
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  // Aplica a todas las rutas excepto archivos estáticos
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
