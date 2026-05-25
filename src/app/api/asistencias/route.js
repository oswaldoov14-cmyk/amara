import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcularDistancia, esTarde, calcularHorasTrabajadas, fechaHoy } from "@/lib/utils";

// POST: Registrar entrada o salida
export async function POST(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { lat, lng, tipo, aclaracion } = await request.json();

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Se requieren coordenadas GPS" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Obtener configuración del trabajo
    const { rows: configRows } = await db.execute(
      "SELECT * FROM configuracion WHERE id = 1"
    );
    const config = configRows[0];

    // Calcular distancia
    const distancia = calcularDistancia(
      lat, lng,
      config.lat_trabajo, config.lng_trabajo
    );

    if (distancia > config.radio_metros) {
      return NextResponse.json({
        error: "Fuera de rango",
        distancia: Math.round(distancia),
        radio: config.radio_metros,
        mensaje: `No puedes registrar tu asistencia fuera de las instalaciones. Estás a ${Math.round(distancia)} metros del centro de trabajo (radio permitido: ${config.radio_metros}m).`,
      }, { status: 403 });
    }

    const hoy = fechaHoy();
    const horaActual = new Date().toTimeString().slice(0, 5);

    // Buscar registro de hoy
    const { rows: registros } = await db.execute({
      sql: "SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ?",
      args: [session.id, hoy],
    });

    if (tipo === "entrada") {
      if (registros.length > 0 && registros[0].hora_entrada) {
        return NextResponse.json(
          { error: "Ya tienes registrada la entrada de hoy" },
          { status: 400 }
        );
      }

      // Obtener datos del usuario para saber horario
      const { rows: userRows } = await db.execute({
        sql: "SELECT * FROM usuarios WHERE id = ?",
        args: [session.id],
      });
      const usuario = userRows[0];
      const tarde = esTarde(horaActual, usuario.horario_entrada || config.horario_entrada);
      const estado = tarde ? "Tarde" : "A tiempo";

      if (tarde && !aclaracion) {
        return NextResponse.json({
          error: "aclaracion_requerida",
          mensaje: "Llegaste tarde. Por favor escribe el motivo de tu retraso.",
          tarde: true,
        }, { status: 422 });
      }

      if (registros.length === 0) {
        await db.execute({
          sql: `INSERT INTO asistencias (usuario_id, fecha, hora_entrada, estado, aclaracion, lat_entrada, lng_entrada)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [session.id, hoy, horaActual, estado, aclaracion || null, lat, lng],
        });
      } else {
        await db.execute({
          sql: `UPDATE asistencias SET hora_entrada = ?, estado = ?, aclaracion = ?, lat_entrada = ?, lng_entrada = ?
                WHERE usuario_id = ? AND fecha = ?`,
          args: [horaActual, estado, aclaracion || null, lat, lng, session.id, hoy],
        });
      }

      return NextResponse.json({
        success: true,
        tipo: "entrada",
        hora: horaActual,
        estado,
        distancia: Math.round(distancia),
      });

    } else if (tipo === "salida") {
      if (registros.length === 0 || !registros[0].hora_entrada) {
        return NextResponse.json(
          { error: "No tienes registrada la entrada de hoy" },
          { status: 400 }
        );
      }
      if (registros[0].hora_salida) {
        return NextResponse.json(
          { error: "Ya tienes registrada la salida de hoy" },
          { status: 400 }
        );
      }

      const horas = calcularHorasTrabajadas(registros[0].hora_entrada, horaActual);

      await db.execute({
        sql: `UPDATE asistencias SET hora_salida = ?, horas_trabajadas = ?, lat_salida = ?, lng_salida = ?
              WHERE usuario_id = ? AND fecha = ?`,
        args: [horaActual, horas, lat, lng, session.id, hoy],
      });

      return NextResponse.json({
        success: true,
        tipo: "salida",
        hora: horaActual,
        horas_trabajadas: horas,
        distancia: Math.round(distancia),
      });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (error) {
    console.error("Attendance error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// GET: Obtener asistencias del empleado actual (o todas si es admin)
export async function GET(request) {
  try {
    await initDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get("mes"); // formato YYYY-MM
    const usuarioId = searchParams.get("usuario_id");
    const hoy = searchParams.get("hoy");

    const db = getDb();
    let sql, args;

    if (session.rol === "admin" && usuarioId) {
      if (hoy) {
        sql = "SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ? ORDER BY fecha DESC";
        args = [usuarioId, fechaHoy()];
      } else if (mes) {
        sql = "SELECT * FROM asistencias WHERE usuario_id = ? AND fecha LIKE ? ORDER BY fecha DESC";
        args = [usuarioId, `${mes}%`];
      } else {
        sql = "SELECT * FROM asistencias WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 90";
        args = [usuarioId];
      }
    } else if (session.rol === "admin") {
      // Todos los empleados, hoy
      sql = `SELECT a.*, u.nombre, u.email FROM asistencias a
             JOIN usuarios u ON a.usuario_id = u.id
             WHERE a.fecha = ? ORDER BY u.nombre`;
      args = [fechaHoy()];
    } else {
      // Empleado: sus propias asistencias
      if (mes) {
        sql = "SELECT * FROM asistencias WHERE usuario_id = ? AND fecha LIKE ? ORDER BY fecha DESC";
        args = [session.id, `${mes}%`];
      } else {
        sql = "SELECT * FROM asistencias WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 90";
        args = [session.id];
      }
    }

    const { rows } = await db.execute({ sql, args });
    const { rows: configRows } = await db.execute("SELECT lat_trabajo, lng_trabajo, radio_metros FROM configuracion WHERE id = 1");
    const config = configRows[0] || null;
    return NextResponse.json({ asistencias: rows, config });
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
