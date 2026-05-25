import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST: Crear empleado (admin)
export async function POST(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { nombre, email, password, sueldo_diario, horario_entrada, horario_salida } = await request.json();

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const db = getDb();

    await db.execute({
      sql: `INSERT INTO usuarios (nombre, email, password_hash, rol, sueldo_diario, horario_entrada, horario_salida)
            VALUES (?, ?, ?, 'empleado', ?, ?, ?)`,
      args: [nombre, email.toLowerCase(), hash, sueldo_diario || 0, horario_entrada || "09:00", horario_salida || "18:00"],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// PATCH: Actualizar datos de empleado
export async function PATCH(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, nombre, sueldo_diario, horario_entrada, horario_salida, activo } = await request.json();

    const db = getDb();
    await db.execute({
      sql: `UPDATE usuarios SET nombre = ?, sueldo_diario = ?, horario_entrada = ?, horario_salida = ?, activo = ?
            WHERE id = ? AND rol = 'empleado'`,
      args: [nombre, sueldo_diario, horario_entrada, horario_salida, activo ?? 1, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// DELETE: Rechazar/Eliminar un empleado pendiente o activo
export async function DELETE(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const db = getDb();
    await db.execute({
      sql: "DELETE FROM usuarios WHERE id = ? AND rol = 'empleado'",
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

