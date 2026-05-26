import { initDb } from "../src/lib/db.js";

async function main() {
  console.log("Initializing DB and migrating schema...");
  await initDb();
  console.log("Done.");
}

main().catch(console.error);
