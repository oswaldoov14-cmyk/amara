import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET: Obtener logs de auditoría
export async function GET(request) {
  try {
    await initDb();

    // 1. Autorizar como administrador
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get("usuario_id");
    const accion = searchParams.get("accion");
    const fecha_inicio = searchParams.get("fecha_inicio"); // YYYY-MM-DD
    const fecha_fin = searchParams.get("fecha_fin");     // YYYY-MM-DD
    
    // Paginación
    const limite = parseInt(searchParams.get("limite") || "50", 10);
    const pagina = parseInt(searchParams.get("pagina") || "1", 10);
    const offset = (pagina - 1) * limite;

    const db = getDb();
    
    let whereClauses = [];
    let args = [];

    if (usuario_id) {
      whereClauses.push("usuario_id = ?");
      args.push(usuario_id);
    }
    if (accion) {
      whereClauses.push("accion LIKE ?");
      args.push(`%${accion}%`);
    }
    if (fecha_inicio) {
      whereClauses.push("creado_en >= ?");
      args.push(`${fecha_inicio} 00:00:00`);
    }
    if (fecha_fin) {
      whereClauses.push("creado_en <= ?");
      args.push(`${fecha_fin} 23:59:59`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 1. Obtener total de registros para paginación
    const countSql = `SELECT COUNT(*) as total FROM logs_auditoria ${whereStr}`;
    const countRes = await db.execute({ sql: countSql, args });
    const total = countRes.rows[0]?.total || 0;

    // 2. Obtener registros de la página actual
    const selectSql = `
      SELECT * FROM logs_auditoria 
      ${whereStr} 
      ORDER BY creado_en DESC 
      LIMIT ? OFFSET ?
    `;
    const selectArgs = [...args, limite, offset];
    const { rows } = await db.execute({ sql: selectSql, args: selectArgs });

    return NextResponse.json({
      logs: rows,
      paginacion: {
        total,
        pagina,
        limite,
        paginas: Math.ceil(total / limite)
      }
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
