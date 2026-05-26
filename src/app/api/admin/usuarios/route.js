import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validate, crearUsuarioSchema, actualizarUsuarioSchema } from "@/lib/validation";
import { registrarAccion } from "@/lib/audit";
import bcrypt from "bcryptjs";

// POST: Crear empleado (admin)
export async function POST(request) {
  try {
    await initDb();
    
    // 1. Autorizar
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    // 2. Validar body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const { ok, data, response: validationError } = validate(crearUsuarioSchema, body);
    if (!ok) return validationError;

    const { nombre, email, password, sueldo_diario, horario_entrada, horario_salida, rol } = data;

    const hash = await bcrypt.hash(password, 10);
    const db = getDb();

    await db.execute({
      sql: `INSERT INTO usuarios (nombre, email, password_hash, rol, sueldo_diario, horario_entrada, horario_salida)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [nombre, email.toLowerCase(), hash, rol, sueldo_diario, horario_entrada, horario_salida],
    });

    // Registrar en auditoría
    await registrarAccion(user.id, user.email, "Crear empleado", {
      nombre,
      email: email.toLowerCase(),
      rol,
      sueldo_diario,
      horario_entrada,
      horario_salida
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// PATCH: Actualizar datos de empleado
export async function PATCH(request) {
  try {
    await initDb();
    
    // 1. Autorizar
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    // 2. Validar body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
    }

    const { ok, data, response: validationError } = validate(actualizarUsuarioSchema, body);
    if (!ok) return validationError;

    const { id, nombre, sueldo_diario, horario_entrada, horario_salida, activo } = data;

    const db = getDb();
    
    // Obtener datos anteriores para auditoría
    const { rows: oldRows } = await db.execute({
      sql: "SELECT nombre, sueldo_diario, horario_entrada, horario_salida, activo FROM usuarios WHERE id = ? LIMIT 1",
      args: [id]
    });
    const oldUser = oldRows[0];

    // Construir consulta dinámica según lo enviado
    let setClause = [];
    let args = [];
    
    if (nombre !== undefined) { setClause.push("nombre = ?"); args.push(nombre); }
    if (sueldo_diario !== undefined) { setClause.push("sueldo_diario = ?"); args.push(sueldo_diario); }
    if (horario_entrada !== undefined) { setClause.push("horario_entrada = ?"); args.push(horario_entrada); }
    if (horario_salida !== undefined) { setClause.push("horario_salida = ?"); args.push(horario_salida); }
    if (activo !== undefined) { setClause.push("activo = ?"); args.push(activo); }
    
    if (setClause.length === 0) {
      return NextResponse.json({ error: "No se enviaron campos para actualizar" }, { status: 400 });
    }
    
    args.push(id);
    await db.execute({
      sql: `UPDATE usuarios SET ${setClause.join(", ")} WHERE id = ? AND rol = 'empleado'`,
      args,
    });

    // Registrar acción de auditoría
    if (oldUser) {
      // Determinar si la acción es una activación/desactivación o una edición de datos ordinaria
      let accion = "Modificar empleado";
      if (activo !== undefined && oldUser.activo !== activo) {
        accion = activo === 1 ? "Aprobar/Activar empleado" : "Desactivar empleado";
      }

      await registrarAccion(user.id, user.email, accion, {
        empleado_id: id,
        antes: oldUser,
        despues: {
          nombre: nombre !== undefined ? nombre : oldUser.nombre,
          sueldo_diario: sueldo_diario !== undefined ? sueldo_diario : oldUser.sueldo_diario,
          horario_entrada: horario_entrada !== undefined ? horario_entrada : oldUser.horario_entrada,
          horario_salida: horario_salida !== undefined ? horario_salida : oldUser.horario_salida,
          activo: activo !== undefined ? activo : oldUser.activo
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// DELETE: Rechazar/Eliminar un empleado pendiente o activo
export async function DELETE(request) {
  try {
    await initDb();
    const { user, error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const db = getDb();

    // Obtener datos del empleado a eliminar para auditoría
    const { rows: targetRows } = await db.execute({
      sql: "SELECT nombre, email, activo FROM usuarios WHERE id = ? LIMIT 1",
      args: [id]
    });
    const targetUser = targetRows[0];

    await db.execute({
      sql: "DELETE FROM usuarios WHERE id = ? AND rol = 'empleado'",
      args: [id],
    });

    if (targetUser) {
      const accion = targetUser.activo === 0 ? "Rechazar solicitud de acceso" : "Eliminar empleado";
      await registrarAccion(user.id, user.email, accion, {
        empleado_id: id,
        nombre: targetUser.nombre,
        email: targetUser.email
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
