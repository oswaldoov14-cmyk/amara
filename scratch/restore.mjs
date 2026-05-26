import { createClient } from "@libsql/client";
import { scryptSync, createDecipheriv } from "crypto";
import fs from "fs";
import path from "path";

const BACKUP_SECRET = process.env.BACKUP_SECRET || "fallback-desarrollo-clave-secreta-2026";
const BACKUPS_DIR = path.join(process.cwd(), "backups");
const RESTORED_DB_FILE = path.join(BACKUPS_DIR, "restored_test.db");

async function runRestore() {
  console.log("🚀 Iniciando proceso de restauración y prueba de integridad...");

  // 1. Encontrar el archivo de backup más reciente
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.error("❌ La carpeta de respaldos no existe.");
    process.exit(1);
  }

  const files = fs.readdirSync(BACKUPS_DIR);
  const backupFiles = files
    .filter(f => f.startsWith("backup-") && f.endsWith(".enc"))
    .map(f => ({
      name: f,
      path: path.join(BACKUPS_DIR, f),
      time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (backupFiles.length === 0) {
    console.error("❌ No se encontraron archivos de respaldo (.enc) en la carpeta.");
    process.exit(1);
  }

  const targetBackup = backupFiles[0];
  console.log(`📂 Utilizando el respaldo más reciente: ${targetBackup.name}`);

  // Limpiar restauración de prueba previa si existiera
  if (fs.existsSync(RESTORED_DB_FILE)) {
    fs.unlinkSync(RESTORED_DB_FILE);
  }

  // 2. Leer archivo y extraer IV (primeros 16 bytes) y cuerpo cifrado
  console.log("🔓 Descifrando archivo...");
  try {
    const fileBuffer = fs.readFileSync(targetBackup.path);
    if (fileBuffer.length < 16) {
      throw new Error("El archivo de respaldo está corrupto o es demasiado pequeño.");
    }

    const iv = fileBuffer.subarray(0, 16);
    const encryptedBody = fileBuffer.subarray(16);

    // Derivar la misma clave criptográfica de 32 bytes con scrypt
    const key = scryptSync(BACKUP_SECRET, "asistencia-salt-v1", 32);

    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBody),
      decipher.final()
    ]);

    // Guardar base de datos descifrada
    fs.writeFileSync(RESTORED_DB_FILE, decryptedBuffer);
    console.log(`✅ Base de datos descifrada y guardada en: ${RESTORED_DB_FILE}`);
  } catch (err) {
    console.error("❌ Error al descifrar el archivo de respaldo:", err.message);
    if (fs.existsSync(RESTORED_DB_FILE)) fs.unlinkSync(RESTORED_DB_FILE);
    process.exit(1);
  }

  // 3. Verificar integridad de la base de datos restaurada usando libsql
  console.log("🔍 Verificando integridad de la base de datos restaurada...");
  let client;
  try {
    client = createClient({
      url: `file:${RESTORED_DB_FILE}`
    });

    const res = await client.execute("PRAGMA integrity_check");
    const status = res.rows[0]?.integrity_check;

    if (status === "ok") {
      console.log("✅ RESULTADO: La base de datos es 100% íntegra y consistente.");
      
      // Consultar rápidamente las tablas
      const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
      console.log("📋 Tablas encontradas en el backup:", tables.rows.map(r => r.name).join(", "));
    } else {
      throw new Error(`Integridad fallida: ${status}`);
    }
  } catch (err) {
    console.error("❌ Error de integridad en la base de datos descifrada:", err);
    process.exit(1);
  } finally {
    if (client) {
      client.close();
    }
    // Esperar un momento a que el SO libere el handle del archivo (solución para Windows EBUSY)
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Eliminar base de datos restaurada de prueba para no dejar basura
    if (fs.existsSync(RESTORED_DB_FILE)) {
      try {
        fs.unlinkSync(RESTORED_DB_FILE);
        console.log("🗑️ Archivo de prueba restaurado eliminado.");
      } catch (err) {
        console.warn("⚠️ No se pudo eliminar el archivo de prueba restored_test.db:", err.message);
      }
    }
  }

  console.log("🎉 Prueba de restauración completada exitosamente.");
}

runRestore();
