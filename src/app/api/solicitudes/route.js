import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fechaHoy } from "@/lib/utils";

// GET: Solicitudes (empleado: las suyas; admin: todas o filtradas)
export async function GET(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");

    const db = getDb();
    let sql, args;

    if (session.rol === "admin") {
      if (estado) {
        sql = `SELECT s.*, u.nombre, u.email FROM solicitudes s
               JOIN usuarios u ON s.usuario_id = u.id
               WHERE s.estado = ? ORDER BY s.creado_en DESC`;
        args = [estado];
      } else {
        sql = `SELECT s.*, u.nombre, u.email FROM solicitudes s
               JOIN usuarios u ON s.usuario_id = u.id
               ORDER BY s.creado_en DESC`;
        args = [];
      }
    } else {
      sql = "SELECT * FROM solicitudes WHERE usuario_id = ? ORDER BY creado_en DESC";
      args = [session.id];
    }

    const { rows } = await db.execute({ sql, args });
    return NextResponse.json({ solicitudes: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST: Crear solicitud (empleado)
export async function POST(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session || session.rol !== "empleado") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { tipo, fecha_inicio, fecha_fin, motivo } = await request.json();

    if (!tipo || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO solicitudes (usuario_id, tipo, fecha_inicio, fecha_fin, motivo)
            VALUES (?, ?, ?, ?, ?)`,
      args: [session.id, tipo, fecha_inicio, fecha_fin, motivo || null],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// PATCH: Aprobar/Rechazar solicitud (admin)
export async function PATCH(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, estado, respuesta_admin } = await request.json();

    if (!id || !estado) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const db = getDb();
    await db.execute({
      sql: "UPDATE solicitudes SET estado = ?, respuesta_admin = ? WHERE id = ?",
      args: [estado, respuesta_admin || null, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
