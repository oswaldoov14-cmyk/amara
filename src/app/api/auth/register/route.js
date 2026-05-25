import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    await initDb();
    const { nombre, email, password } = await request.json();

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos (nombre, correo, contraseña) son obligatorios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

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
