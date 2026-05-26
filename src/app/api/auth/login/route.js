import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, initDb } from "@/lib/db";
import { createToken } from "@/lib/auth";
import { loginSchema, validate } from "@/lib/validation";
import { checkRateLimit, clearRateLimit } from "@/lib/rateLimit";

const MIN_RESPONSE_TIME = 800;

export async function POST(request) {
  const start = Date.now();
  
  try {
    await initDb();
    
    // 1. Validar body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const { ok, data, response: errorResponse } = validate(loginSchema, body);
    if (!ok) {
      await delay(MIN_RESPONSE_TIME, start);
      return errorResponse;
    }

    const { email, password } = data;

    // 2. Rate limiting por email
    const { allowed, resetInSeconds } = checkRateLimit('login:email', email, 5, 15 * 60 * 1000);
    if (!allowed) {
      await delay(MIN_RESPONSE_TIME, start);
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${resetInSeconds} segundos.` },
        { status: 429 }
      );
    }

    // 3. Buscar usuario en base de datos
    const db = getDb();
    const { rows } = await db.execute({
      sql: "SELECT * FROM usuarios WHERE email = ? LIMIT 1",
      args: [email.toLowerCase().trim()],
    });

    const user = rows[0];

    // 4. Verificar contraseña con tiempo constante para mitigar timing attacks
    const hashToCompare = user?.password_hash ?? "$2b$10$invalidhashpaddingtomatchlength0000000000000";
    const passwordOk = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordOk) {
      await delay(MIN_RESPONSE_TIME, start);
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    // Si está inactivo
    if (user.activo === 0) {
      await delay(MIN_RESPONSE_TIME, start);
      return NextResponse.json(
        { error: "Tu cuenta está pendiente de aprobación por el administrador." },
        { status: 403 }
      );
    }

    // 5. Login exitoso: limpiar rate limits
    clearRateLimit('login:email', email);

    // 6. Generar token firmado
    const token = await createToken({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    });

    const response = NextResponse.json({
      success: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });

    // 7. Depositar cookie segura HTTP-only
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    await delay(MIN_RESPONSE_TIME, start);
    return response;

  } catch (error) {
    console.error("Login API error:", error);
    await delay(MIN_RESPONSE_TIME, start);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

function delay(minMs, start) {
  const elapsed = Date.now() - start;
  const remaining = minMs - elapsed;
  return remaining > 0 ? new Promise((r) => setTimeout(r, remaining)) : Promise.resolve();
}
