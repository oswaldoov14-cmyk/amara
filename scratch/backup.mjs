import { createClient } from "@libsql/client";
import { scryptSync, randomBytes, createCipheriv } from "crypto";
import fs from "fs";
import path from "path";

// Cargar variables de entorno si se ejecutan de manera aislada
const BACKUP_SECRET = process.env.BACKUP_SECRET || "fallback-desarrollo-clave-secreta-2026";
const DB_FILE = path.join(process.cwd(), "asistencia.db");
const BACKUPS_DIR = path.join(process.cwd(), "backups");
const SNAPSHOT_FILE = path.join(BACKUPS_DIR, "snapshot.db");

async function runBackup() {
  console.log("🚀 Iniciando proceso de copia de seguridad segura...");
  
  // 1. Crear carpeta backups/ si no existe
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    console.log("📂 Carpeta de respaldos creada en:", BACKUPS_DIR);
  }

  // 2. Limpiar snapshot previo si existiera por una corrida fallida
  if (fs.existsSync(SNAPSHOT_FILE)) {
    fs.unlinkSync(SNAPSHOT_FILE);
  }

  // 3. Ejecutar VACUUM INTO para hacer un snapshot consistente y seguro
  console.log("📦 Generando snapshot consistente de la base de datos (VACUUM INTO)...");
  let dbClient;
  try {
    dbClient = createClient({
      url: `file:${DB_FILE}`
    });
    
    // Ejecutar VACUUM INTO
    // En SQLite, debemos pasar la ruta absoluta entre comillas simples
    await dbClient.execute(`VACUUM INTO '${SNAPSHOT_FILE.replace(/\\/g, "/")}'`);
    console.log("✅ Snapshot creado con éxito.");
  } catch (err) {
    console.error("❌ Error al crear el snapshot de la base de datos:", err);
    process.exit(1);
  } finally {
    if (dbClient) {
      dbClient.close();
    }
  }

  // 4. Derivar clave de 32 bytes usando scrypt con sal estática
  console.log("🔑 Derivando clave criptográfica segura...");
  const key = scryptSync(BACKUP_SECRET, "asistencia-salt-v1", 32);
  const iv = randomBytes(16);

  // 5. Preparar archivo de salida
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const backupFileName = `backup-${dateStr}.enc`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  console.log(`🔒 Cifrando snapshot usando AES-256-CBC hacia ${backupFileName}...`);
  try {
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    
    const inputBuffer = fs.readFileSync(SNAPSHOT_FILE);
    const encryptedBody = Buffer.concat([
      cipher.update(inputBuffer),
      cipher.final()
    ]);

    // Anteponer el IV de 16 bytes al cuerpo cifrado (Corrección 2)
    const finalBuffer = Buffer.concat([iv, encryptedBody]);
    fs.writeFileSync(backupFilePath, finalBuffer);

    console.log(`✅ Backup cifrado guardado correctamente (${finalBuffer.length} bytes).`);
  } catch (err) {
    console.error("❌ Error al cifrar el snapshot:", err);
    // Intentar limpiar
    if (fs.existsSync(SNAPSHOT_FILE)) fs.unlinkSync(SNAPSHOT_FILE);
    process.exit(1);
  }

  // 6. Eliminar snapshot temporal (Corrección 1)
  console.log("🧹 Limpiando archivos temporales...");
  if (fs.existsSync(SNAPSHOT_FILE)) {
    fs.unlinkSync(SNAPSHOT_FILE);
    console.log("🗑️ Snapshot temporal eliminado.");
  }

  // 7. Rotar respaldos (mantener solo los últimos 7 días)
  console.log("🔄 Ejecutando rotación de respaldos viejos (+7 días)...");
  try {
    const files = fs.readdirSync(BACKUPS_DIR);
    const backupFiles = files
      .filter(f => f.startsWith("backup-") && f.endsWith(".enc"))
      .map(f => ({
        name: f,
        path: path.join(BACKUPS_DIR, f),
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // De más reciente a más viejo

    if (backupFiles.length > 7) {
      const filesToDelete = backupFiles.slice(7);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Backup antiguo eliminado: ${file.name}`);
      }
    }
    console.log("✅ Proceso de copia de seguridad completado.");
  } catch (err) {
    console.warn("⚠️ Advertencia al rotar copias de seguridad:", err);
  }
}

runBackup();
