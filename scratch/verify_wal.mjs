import { createClient } from "@libsql/client";
import path from "path";

const dbPath = path.join(process.cwd(), "asistencia.db");
const db = createClient({
  url: `file:${dbPath}`
});

async function verify() {
  try {
    const res = await db.execute("PRAGMA journal_mode");
    console.log("📊 JOURNAL MODE ACTUAL:", res.rows[0]);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    db.close();
  }
}

verify();
