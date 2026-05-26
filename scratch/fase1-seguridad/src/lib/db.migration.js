/**
 * src/lib/db.js — Agrega esto dentro de tu función initDb() existente
 *
 * Solo pega el bloque de CREATE TABLE y CREATE INDEX dentro del
 * db.exec() o donde inicializas las tablas en tu proyecto.
 *
 * Si tu initDb() ya tiene un db.exec(`...`) con las 4 tablas originales,
 * agrega estas líneas al mismo string SQL.
 */

// ─── NUEVA TABLA: blocklist de JWT ────────────────────────────────────────────
//
//   jti        → ID único del token (UUID generado al firmarlo)
//   expires_at → Unix timestamp en segundos; se usa para limpiar registros viejos
//
const MIGRATION_BLOCKLIST = `
  CREATE TABLE IF NOT EXISTS token_blocklist (
    jti        TEXT    PRIMARY KEY,
    expires_at INTEGER NOT NULL
  );
`

// ─── NUEVOS ÍNDICES para mejorar rendimiento en consultas frecuentes ──────────
//
//   asistencias: las consultas de nómina y historial filtran por usuario_id + fecha
//   solicitudes: el admin filtra por estado 'pendiente' con frecuencia
//
const MIGRATION_INDICES = `
  CREATE INDEX IF NOT EXISTS idx_asistencias_usuario_fecha
    ON asistencias (usuario_id, fecha);

  CREATE INDEX IF NOT EXISTS idx_solicitudes_estado
    ON solicitudes (estado);

  CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario
    ON solicitudes (usuario_id);

  CREATE INDEX IF NOT EXISTS idx_blocklist_expires
    ON token_blocklist (expires_at);
`

// ─── Ejemplo de cómo integrar en tu db.js existente ──────────────────────────

/*
import { createClient } from '@libsql/client'

const db = createClient({ url: 'file:asistencia.db' })

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS usuarios ( ... );
    CREATE TABLE IF NOT EXISTS asistencias ( ... );
    CREATE TABLE IF NOT EXISTS solicitudes ( ... );
    CREATE TABLE IF NOT EXISTS configuracion ( ... );

    -- NUEVO: agregar estas líneas al final del mismo bloque
    CREATE TABLE IF NOT EXISTS token_blocklist (
      jti        TEXT    PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_asistencias_usuario_fecha
      ON asistencias (usuario_id, fecha);

    CREATE INDEX IF NOT EXISTS idx_solicitudes_estado
      ON solicitudes (estado);

    CREATE INDEX IF NOT EXISTS idx_blocklist_expires
      ON token_blocklist (expires_at);
  `)
}
*/

export { MIGRATION_BLOCKLIST, MIGRATION_INDICES }
