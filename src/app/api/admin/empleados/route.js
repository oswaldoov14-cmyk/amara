import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { calcularNomina, fechaHoy } from "@/lib/utils";

// GET: Todos los empleados con estado de hoy (admin)
export async function GET(request) {
  try {
    await initDb();
    
    // 1. Autorizar
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const vista = searchParams.get("vista"); // "hoy" | "nomina"
    const semanaInicio = searchParams.get("semana_inicio");

    const db = getDb();
    const hoy = fechaHoy();

    if (vista === "nomina" && semanaInicio) {
      const { rows: activeEmployees } = await db.execute(
        "SELECT * FROM usuarios WHERE rol = 'empleado' AND activo = 1 ORDER BY nombre"
      );

      // Calcular nómina semanal
      const { rows: configRows } = await db.execute("SELECT * FROM configuracion WHERE id = 1");
      const config = configRows[0];

      // Obtener fecha fin de semana (6 días después del inicio)
      const inicio = new Date(semanaInicio + "T00:00:00");
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 5);
      const semanaFin = fin.toLocaleDateString("sv");

      const nominas = await Promise.all(
        activeEmployees.map(async (emp) => {
          const { rows: asistencias } = await db.execute({
            sql: `SELECT * FROM asistencias WHERE usuario_id = ? AND fecha >= ? AND fecha <= ?`,
            args: [emp.id, semanaInicio, semanaFin],
          });

          const { rows: solicitudes } = await db.execute({
            sql: `SELECT * FROM solicitudes WHERE usuario_id = ? AND estado = 'aprobada'
                  AND fecha_inicio <= ? AND fecha_fin >= ?`,
            args: [emp.id, semanaFin, semanaInicio],
          });

          const nomina = calcularNomina(emp, asistencias, solicitudes, config);
          return {
            empleado: {
              id: emp.id,
              nombre: emp.nombre,
              email: emp.email,
              sueldo_diario: emp.sueldo_diario,
              horario_entrada: emp.horario_entrada,
              horario_salida: emp.horario_salida,
            },
            nomina,
            asistencias,
          };
        })
      );

      return NextResponse.json({ nominas, semana: { inicio: semanaInicio, fin: semanaFin } });
    }

    // Vista general: estado de hoy (solo empleados activos)
    const { rows: activeEmployees } = await db.execute(
      "SELECT * FROM usuarios WHERE rol = 'empleado' AND activo = 1 ORDER BY nombre"
    );

    const resumen = await Promise.all(
      activeEmployees.map(async (emp) => {
        const { rows: hoyRows } = await db.execute({
          sql: "SELECT * FROM asistencias WHERE usuario_id = ? AND fecha = ?",
          args: [emp.id, hoy],
        });

        // Contar asistencias esta semana
        const lunesStr = getLunes(hoy);
        const { rows: semanaRows } = await db.execute({
          sql: `SELECT COUNT(*) as cnt FROM asistencias WHERE usuario_id = ? AND fecha >= ? AND fecha <= ?
                AND (estado = 'A tiempo' OR estado = 'Tarde')`,
          args: [emp.id, lunesStr, hoy],
        });

        const asistenciaHoy = hoyRows[0];
        let estadoHoy = "No registrado";
        if (asistenciaHoy?.hora_entrada) {
          estadoHoy = asistenciaHoy.estado;
          if (asistenciaHoy.hora_salida) estadoHoy += " (Salió)";
        }

        return {
          id: emp.id,
          nombre: emp.nombre,
          email: emp.email,
          sueldo_diario: emp.sueldo_diario,
          horario_entrada: emp.horario_entrada,
          horario_salida: emp.horario_salida,
          activo: emp.activo,
          estadoHoy,
          horaEntrada: asistenciaHoy?.hora_entrada || null,
          horaSalida: asistenciaHoy?.hora_salida || null,
          asistenciasSemana: semanaRows[0]?.cnt || 0,
        };
      })
    );

    // Obtener solicitudes de acceso pendientes (usuarios inactivos)
    const { rows: pendientes } = await db.execute(
      "SELECT id, nombre, email, creado_en FROM usuarios WHERE rol = 'empleado' AND activo = 0 ORDER BY creado_en DESC"
    );

    return NextResponse.json({ empleados: resumen, pendientes });
  } catch (error) {
    console.error("Get admin employees error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

function getLunes(fechaStr) {
  const d = new Date(fechaStr + "T12:00:00");
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("sv");
}
