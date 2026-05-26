import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validate, registroSchema } from "@/lib/validation";

export async function POST(request) {
  try {
    await initDb();
    
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const { ok, data, response: errorResponse } = validate(registroSchema, body);
    if (!ok) return errorResponse;

    const { nombre, email, password } = data;

    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const { rows: existingUser } = await db.execute({
      sql: "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
      args: [cleanEmail],
    });

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 400 }
      );
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert user as inactive (activo = 0)
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, email, password_hash, rol, sueldo_diario, horario_entrada, horario_salida, activo)
            VALUES (?, ?, ?, 'empleado', 0, '09:00', '18:00', 0)`,
      args: [nombre.trim(), cleanEmail, hash],
    });

    return NextResponse.json({
      success: true,
      mensaje: "Cuenta creada con éxito. Tu registro está pendiente de aprobación por el administrador.",
    });
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error en el servidor al registrar la cuenta." },
      { status: 500 }
    );
  }
}

