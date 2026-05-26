import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validate, configuracionSchema } from "@/lib/validation";
import { registrarAccion } from "@/lib/audit";

// GET: Obtener configuración
export async function GET(request) {
  try {
    await initDb();
    
    // 1. Autorizar
    const { error } = await requireAdmin(request);
    if (error) return error;

    const db = getDb();
    const { rows } = await db.execute("SELECT * FROM configuracion WHERE id = 1");
    return NextResponse.json({ config: rows[0] });
  } catch (error) {
    console.error("Get config error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// PUT: Actualizar configuración
export async function PUT(request) {
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

    const { ok, data, response: validationError } = validate(configuracionSchema, body);
    if (!ok) return validationError;

    const { lat_trabajo, lng_trabajo, radio_metros, horario_entrada, horario_salida, tarifa_hora_extra } = data;

    const db = getDb();

    // Obtener configuración anterior para auditoría
    const { rows: oldRows } = await db.execute("SELECT * FROM configuracion WHERE id = 1");
    const oldConfig = oldRows[0];

    await db.execute({
      sql: `UPDATE configuracion SET lat_trabajo = ?, lng_trabajo = ?, radio_metros = ?,
            horario_entrada = ?, horario_salida = ?, tarifa_hora_extra = ? WHERE id = 1`,
      args: [lat_trabajo, lng_trabajo, radio_metros, horario_entrada, horario_salida, tarifa_hora_extra],
    });

    // Registrar acción de auditoría
    await registrarAccion(user.id, user.email, "Actualizar configuración", {
      antes: oldConfig,
      despues: { lat_trabajo, lng_trabajo, radio_metros, horario_entrada, horario_salida, tarifa_hora_extra }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Put config error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
