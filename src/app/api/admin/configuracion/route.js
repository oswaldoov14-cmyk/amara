import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET: Obtener configuración
export async function GET() {
  try {
    await initDb();
    const session = await getSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDb();
    const { rows } = await db.execute("SELECT * FROM configuracion WHERE id = 1");
    return NextResponse.json({ config: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// PUT: Actualizar configuración
export async function PUT(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session || session.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { lat_trabajo, lng_trabajo, radio_metros, horario_entrada, horario_salida, tarifa_hora_extra } =
      await request.json();

    const db = getDb();
    await db.execute({
      sql: `UPDATE configuracion SET lat_trabajo = ?, lng_trabajo = ?, radio_metros = ?,
            horario_entrada = ?, horario_salida = ?, tarifa_hora_extra = ? WHERE id = 1`,
      args: [lat_trabajo, lng_trabajo, radio_metros, horario_entrada, horario_salida, tarifa_hora_extra],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
