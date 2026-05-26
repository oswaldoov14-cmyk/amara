import { getDb } from "./db";

/**
 * Registra una acción administrativa o crítica en la tabla de auditoría.
 * Esta firma está desacoplada de la petición HTTP (Next.js Request)
 * para permitir llamadas desde cron jobs, scripts o APIs.
 *
 * @param {number} usuarioId - ID del usuario que realiza la acción
 * @param {string} usuarioEmail - Email del usuario que realiza la acción
 * @param {string} accion - Nombre corto de la acción (ej. "Actualizar configuración")
 * @param {object} detalles - Objeto con datos detallados (ej. { antes, despues })
 */
export async function registrarAccion(usuarioId, usuarioEmail, accion, detalles = {}) {
  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO logs_auditoria (usuario_id, usuario_email, accion, detalles)
            VALUES (?, ?, ?, ?)`,
      args: [
        usuarioId,
        usuarioEmail,
        accion,
        JSON.stringify(detalles)
      ]
    });
  } catch (err) {
    console.error("❌ Error al registrar acción de auditoría:", err);
  }
}
