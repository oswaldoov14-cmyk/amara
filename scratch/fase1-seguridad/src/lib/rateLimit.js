/**
 * Rate limiter en memoria — sin dependencias externas
 * Guarda intentos por clave (IP, email, etc.) con ventana deslizante
 *
 * USO:
 *   const result = checkRateLimit('login', ip, 5, 15 * 60 * 1000)
 *   if (!result.allowed) return Response.json({ error: 'Demasiados intentos' }, { status: 429 })
 */

const store = new Map()

/**
 * Limpia entradas expiradas del store para evitar fuga de memoria
 * Se llama automáticamente cada vez que se consulta el store
 */
function cleanExpired(now) {
  for (const [key, data] of store) {
    if (data.resetAt < now) store.delete(key)
  }
}

/**
 * @param {string} prefix    - Namespace del límite, ej: 'login', 'api'
 * @param {string} identifier - IP o email del usuario
 * @param {number} maxAttempts - Intentos permitidos en la ventana
 * @param {number} windowMs  - Duración de la ventana en milisegundos
 * @returns {{ allowed: boolean, remaining: number, resetInSeconds: number }}
 */
export function checkRateLimit(prefix, identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  cleanExpired(now)

  const key = `${prefix}:${identifier}`
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetInSeconds: Math.ceil(windowMs / 1000) }
  }

  existing.count++

  const resetInSeconds = Math.ceil((existing.resetAt - now) / 1000)
  const remaining = Math.max(0, maxAttempts - existing.count)

  return {
    allowed: existing.count <= maxAttempts,
    remaining,
    resetInSeconds,
  }
}

/**
 * Limpia manualmente la clave (ej. al hacer logout o login exitoso)
 * @param {string} prefix
 * @param {string} identifier
 */
export function clearRateLimit(prefix, identifier) {
  store.delete(`${prefix}:${identifier}`)
}
