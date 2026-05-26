import { createClient } from "@libsql/client";
import path from "path";

const dbPath = path.join(process.cwd(), "asistencia.db");
const client = createClient({
  url: `file:${dbPath}`,
});

async function check() {
  try {
    console.log("Running migration...");
    await client.executeMultiple(`
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
    `);
    console.log("Migration finished.");

    const config = await client.execute("SELECT * FROM configuracion");
    console.log("CONFIG TABLE:", config.rows);
    
    const users = await client.execute("SELECT id, nombre, email, rol, activo FROM usuarios");
    console.log("USERS:", users.rows);

    const schema = await client.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'index')");
    console.log("SCHEMA TABLES/INDEXES:");
    console.table(schema.rows);
  } catch (err) {
    console.error(err);
  }
}

check();


