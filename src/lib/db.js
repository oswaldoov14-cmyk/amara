import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(process.cwd(), "asistencia.db");

let _client = null;

export function getDb() {
  if (!_client) {
    const url = process.env.DB_URL || `file:${dbPath}`;
    const authToken = process.env.DB_TOKEN || undefined;
    
    _client = createClient({
      url,
      authToken,
    });
  }
  return _client;
}

export async function initDb() {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'empleado',
      sueldo_diario REAL DEFAULT 0,
      horario_entrada TEXT DEFAULT '09:00',
      horario_salida TEXT DEFAULT '18:00',
      activo INTEGER DEFAULT 1,
      creado_en TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS asistencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora_entrada TEXT,
      hora_salida TEXT,
      estado TEXT DEFAULT 'A tiempo',
      aclaracion TEXT,
      lat_entrada REAL,
      lng_entrada REAL,
      lat_salida REAL,
      lng_salida REAL,
      horas_trabajadas REAL DEFAULT 0,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS solicitudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      motivo TEXT,
      estado TEXT DEFAULT 'pendiente',
      respuesta_admin TEXT,
      creado_en TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY DEFAULT 1,
      lat_trabajo REAL DEFAULT 20.966667,
      lng_trabajo REAL DEFAULT -89.623333,
      radio_metros INTEGER DEFAULT 100,
      horario_entrada TEXT DEFAULT '09:00',
      horario_salida TEXT DEFAULT '18:00',
      tarifa_hora_extra REAL DEFAULT 1.5
    );

    INSERT OR IGNORE INTO configuracion (id) VALUES (1);
  `);

  // Crear admin por defecto si no existe
  const { rows } = await db.execute(
    "SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1"
  );
  if (rows.length === 0) {
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash("admin123", 10);
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, email, password_hash, rol, sueldo_diario)
            VALUES ('Administrador', 'admin@empresa.com', ?, 'admin', 0)`,
      args: [hash],
    });
  }

  // Crear empleados de demo si no existen
  const { rows: empRows } = await db.execute(
    "SELECT id FROM usuarios WHERE rol = 'empleado' LIMIT 1"
  );
  if (empRows.length === 0) {
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash("emp123", 10);
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, email, password_hash, rol, sueldo_diario, horario_entrada, horario_salida)
            VALUES ('Juan García', 'juan@empresa.com', ?, 'empleado', 250, '09:00', '18:00')`,
      args: [hash],
    });
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, email, password_hash, rol, sueldo_diario, horario_entrada, horario_salida)
            VALUES ('María López', 'maria@empresa.com', ?, 'empleado', 300, '09:00', '18:00')`,
      args: [hash],
    });
  }

  console.log("✅ Base de datos inicializada");
}
