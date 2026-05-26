import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { validate, crearSolicitudSchema, responderSolicitudSchema } from "@/lib/validation";
import { registrarAccion } from "@/lib/audit";

// GET: Solicitudes (empleado: las suyas; admin: todas o filtradas)
export async function GET(request) {
  try {
    await initDb();
    
    // 1. Autenticar
    const { user: session, error } = await requireAuth(request);
    if (error) return error;

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
    console.error("Get requests error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// POST: Crear solicitud (empleado)
export async function POST(request) {
  try {
    await initDb();
    
    // 1. Autenticar (requiere que el usuario esté logueado como empleado, o simplemente autenticado)
    const { user: session, error } = await requireAuth(request);
    if (error) return error;

    // Solo empleados pueden crear solicitudes
    if (session.rol !== "empleado") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // 2. Validar body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const { ok, data, response: validationError } = validate(crearSolicitudSchema, body);
    if (!ok) return validationError;

    const { tipo, fecha_inicio, fecha_fin, motivo } = data;

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO solicitudes (usuario_id, tipo, fecha_inicio, fecha_fin, motivo)
            VALUES (?, ?, ?, ?, ?)`,
      args: [session.id, tipo, fecha_inicio, fecha_fin, motivo || null],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// PATCH: Aprobar/Rechazar solicitud (admin)
export async function PATCH(request) {
  try {
    await initDb();
    
    // 1. Autorizar como administrador
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    // 2. Validar body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const { ok, data, response: validationError } = validate(responderSolicitudSchema, body);
    if (!ok) return validationError;

    const { id, estado, respuesta_admin } = data;

    const db = getDb();

    // Obtener detalles de la solicitud antes de responder para auditoría
    const { rows: targetRows } = await db.execute({
      sql: `SELECT s.tipo, s.fecha_inicio, s.fecha_fin, u.nombre, u.email 
            FROM solicitudes s 
            JOIN usuarios u ON s.usuario_id = u.id 
            WHERE s.id = ? LIMIT 1`,
      args: [id]
    });
    const targetRequest = targetRows[0];

    await db.execute({
      sql: "UPDATE solicitudes SET estado = ?, respuesta_admin = ? WHERE id = ?",
      args: [estado, respuesta_admin || null, id],
    });

    // Registrar acción de auditoría
    if (targetRequest) {
      const accion = estado === "aprobado" ? "Aprobar solicitud" : "Rechazar solicitud";
      await registrarAccion(user.id, user.email, accion, {
        solicitud_id: id,
        tipo: targetRequest.tipo,
        fecha_inicio: targetRequest.fecha_inicio,
        fecha_fin: targetRequest.fecha_fin,
        empleado_nombre: targetRequest.nombre,
        empleado_email: targetRequest.email,
        respuesta_admin
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Respond request error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
