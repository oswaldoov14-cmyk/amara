import { createClient } from "@libsql/client";
import path from "path";

const dbPath = path.join(process.cwd(), "asistencia.db");
const client = createClient({
  url: `file:${dbPath}`,
});

async function check() {
  try {
    const config = await client.execute("SELECT * FROM configuracion");
    console.log("CONFIG TABLE:", config.rows);
    
    const users = await client.execute("SELECT id, nombre, email, rol FROM usuarios");
    console.log("USERS:", users.rows);
  } catch (err) {
    console.error(err);
  }
}

check();
