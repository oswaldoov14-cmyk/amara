import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { isTokenRevoked } from "@/lib/blocklist";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "sistema-asistencia-secret-2024"
);

/**
 * Crea un nuevo token firmado con un UUID (jti) único
 */
export async function createToken(payload) {
  const jti = crypto.randomUUID();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

/**
 * Verifica un token, comprueba la blocklist y valida que el usuario siga activo
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    
    // 1. Verificar blocklist
    if (payload.jti) {
      const revoked = await isTokenRevoked(payload.jti);
      if (revoked) return null;
    }
    
    // 2. Verificar que el usuario siga activo en la base de datos
    const db = getDb();
    const { rows } = await db.execute({
      sql: "SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ? LIMIT 1",
      args: [payload.id],
    });
    
    const user = rows[0];
    if (!user || user.activo === 0) {
      return null;
    }
    
    return user;
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario de la sesión actual de cookies (compatible con el código existente)
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Requiere autenticación y retorna { user } o { error: Response } (compatible con la fase 1)
 */
export async function requireAuth(request) {
  const session = await getSession();
  if (!session) {
    return { error: Response.json({ error: 'No autenticado, sesión inválida o inactiva' }, { status: 401 }) };
  }
  return { user: session };
}

/**
 * Requiere rol de administrador
 */
export async function requireAdmin(request) {
  const result = await requireAuth(request);
  if (result.error) return result;

  if (result.user.rol !== 'admin') {
    return { error: Response.json({ error: 'Acceso denegado' }, { status: 403 }) };
  }

  return result;
}

/**
 * Retorna el usuario o null si no hay sesión
 */
export async function getSessionOrNull(request) {
  return await getSession();
}
