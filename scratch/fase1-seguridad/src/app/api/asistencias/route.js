/**
 * src/app/api/asistencias/route.js — Ejemplo con validación completa
 *
 * Muestra cómo usar los nuevos helpers en cualquier API Route.
 * Aplica el mismo patrón en todos tus endpoints.
 */

import { createClient } from '@libsql/client'
import { requireAuth } from '@/lib/auth'
import { validate, asistenciaSchema } from '@/lib/validation'
import { calcularDistancia, redondearHoras } from '@/lib/utils'

const db = createClient({ url: 'file:asistencia.db' })

export async function POST(request) {
  // ── 1. Autenticar ─────────────────────────────────────────────────────────
  const { user, error } = await requireAuth(request)
  if (error) return error

  // ── 2. Validar body con Zod ───────────────────────────────────────────────
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { ok, data, response: validationError } = validate(asistenciaSchema, body)
  if (!ok) return validationError

  const { tipo, lat, lng, aclaracion } = data

  // ── 3. Obtener configuración del trabajo ──────────────────────────────────
  const config = (await db.execute('SELECT * FROM configuracion WHERE id = 1')).rows[0]
  if (!config) {
    return Response.json({ error: 'Configuración no encontrada' }, { status: 500 })
  }

  // ── 4. Validar distancia GPS ──────────────────────────────────────────────
  const distancia = calcularDistancia(lat, lng, config.lat_trabajo, config.lng_trabajo)
  if (distancia > config.radio_metros) {
    return Response.json(
      {
        error: `Estás a ${Math.round(distancia)} metros del centro de trabajo. Máximo permitido: ${config.radio_metros}m.`,
        distancia: Math.round(distancia),
      },
      { status: 403 }
    )
  }

  const fecha = new Date().toISOString().split('T')[0]
  const hora = new Date().toTimeString().slice(0, 5)

  if (tipo === 'entrada') {
    // ── 5a. Registrar entrada ─────────────────────────────────────────────
    const userData = (
      await db.execute({
        sql: 'SELECT horario_entrada FROM usuarios WHERE id = ?',
        args: [user.id],
      })
    ).rows[0]

    const esTarde = hora > (userData?.horario_entrada ?? config.horario_entrada)
    const estado = esTarde ? 'Tarde' : 'A tiempo'

    // Si llega tarde, aclaracion es obligatoria
    if (esTarde && !aclaracion?.trim()) {
      return Response.json(
        { error: 'Se requiere una aclaración al ingresar tarde.' },
        { status: 422 }
      )
    }

    await db.execute({
      sql: `INSERT INTO asistencias (usuario_id, fecha, hora_entrada, estado, aclaracion, lat_entrada, lng_entrada)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (usuario_id, fecha) DO NOTHING`,
      args: [user.id, fecha, hora, estado, aclaracion ?? null, lat, lng],
    })

    return Response.json({ ok: true, estado, hora })
  }

  if (tipo === 'salida') {
    // ── 5b. Registrar salida ──────────────────────────────────────────────
    const registro = (
      await db.execute({
        sql: 'SELECT hora_entrada FROM asistencias WHERE usuario_id = ? AND fecha = ?',
        args: [user.id, fecha],
      })
    ).rows[0]

    if (!registro?.hora_entrada) {
      return Response.json({ error: 'No hay entrada registrada hoy.' }, { status: 409 })
    }

    // Calcular horas trabajadas
    const [hE, mE] = registro.hora_entrada.split(':').map(Number)
    const [hS, mS] = hora.split(':').map(Number)
    const minutosTrabajados = (hS * 60 + mS) - (hE * 60 + mE)
    const horasTrabajadas = redondearHoras(Math.max(0, minutosTrabajados))

    await db.execute({
      sql: `UPDATE asistencias
            SET hora_salida = ?, lat_salida = ?, lng_salida = ?, horas_trabajadas = ?
            WHERE usuario_id = ? AND fecha = ?`,
      args: [hora, lat, lng, horasTrabajadas, user.id, fecha],
    })

    return Response.json({ ok: true, horas_trabajadas: horasTrabajadas })
  }
}

export async function GET(request) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get('mes') // formato YYYY-MM

  let sql = 'SELECT * FROM asistencias WHERE usuario_id = ?'
  const args = [user.id]

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    sql += ' AND fecha LIKE ?'
    args.push(`${mes}%`)
  }

  sql += ' ORDER BY fecha DESC'

  const result = await db.execute({ sql, args })
  return Response.json({ asistencias: result.rows })
}
