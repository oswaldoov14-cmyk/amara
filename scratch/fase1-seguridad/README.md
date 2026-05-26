# Fase 1 — Seguridad crítica

Archivos listos para copiar a tu proyecto PrintFleet / Sistema de Asistencia.

---

## Instalación

```bash
npm install zod
```

No se necesita ninguna otra dependencia. El rate limiter es en memoria pura.

---

## Pasos de integración (en este orden)

### 1. Agregar la tabla de blocklist a tu base de datos

Abre `src/lib/db.js` (o donde tengas `initDb()`) y agrega estas líneas
al final del bloque SQL existente:

```sql
CREATE TABLE IF NOT EXISTS token_blocklist (
  jti        TEXT    PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asistencias_usuario_fecha
  ON asistencias (usuario_id, fecha);

CREATE INDEX IF NOT EXISTS idx_blocklist_expires
  ON token_blocklist (expires_at);
```

### 2. Verificar variable de entorno JWT_SECRET

Tu `.env.local` debe tener:

```
JWT_SECRET=una_clave_larga_y_aleatoria_de_al_menos_32_caracteres
```

Si no la tienes, genera una:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Copiar los archivos nuevos

```
src/
├── middleware.js              ← NUEVO (reemplaza si ya existía)
├── lib/
│   ├── rateLimit.js           ← NUEVO
│   ├── blocklist.js           ← NUEVO
│   ├── validation.js          ← NUEVO
│   └── auth.js                ← REEMPLAZA el tuyo
└── app/api/
    ├── auth/login/route.js    ← REEMPLAZA el tuyo
    ├── auth/logout/route.js   ← REEMPLAZA el tuyo
    └── asistencias/route.js   ← EJEMPLO — adapta el tuyo
```

### 4. Actualizar tus otros endpoints

Aplica este patrón en cada API Route existente:

```js
import { requireAuth, requireAdmin } from '@/lib/auth'
import { validate, crearUsuarioSchema } from '@/lib/validation'

export async function POST(request) {
  // Auth
  const { user, error } = await requireAuth(request)   // o requireAdmin
  if (error) return error

  // Validación
  const body = await request.json()
  const { ok, data, response } = validate(crearUsuarioSchema, body)
  if (!ok) return response

  // ... tu lógica normal con data.campo ya sanitizado
}
```

### 5. Verificar los headers de seguridad

Después de correr `npm run dev`, abre las DevTools del navegador
→ Network → cualquier request → Response Headers.

Deberías ver:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: ...`
- `Strict-Transport-Security: ...` (solo en producción con HTTPS)

---

## Qué cubre esta fase

| Vulnerabilidad | Solución |
|---|---|
| Brute force en login | Rate limiting 5 intentos / 15 min por IP y por email |
| Timing attack (revela si el email existe) | Siempre tardamos ≥800ms, hash falso si usuario no existe |
| JWT sin revocación | Blocklist con `jti` en SQLite, limpieza automática |
| Inputs sin validar | Zod en todos los endpoints, tipos y rangos verificados |
| Headers HTTP inseguros | CSP, HSTS, X-Frame-Options, Referrer-Policy en middleware |
| Usuario desactivado con sesión activa | `requireAuth` verifica `activo=1` en cada request |

---

## Notas

- El rate limiter es **en memoria**: se resetea al reiniciar el servidor.
  Para producción real considera `@upstash/ratelimit` con Redis.
- La blocklist de JWT **sí persiste** en SQLite entre reinicios.
- El `middleware.js` se ejecuta en el Edge Runtime de Next.js,
  por eso `rateLimit.js` usa solo APIs nativas (Map, Date) sin imports de Node.
