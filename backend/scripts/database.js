import { createDatabase, readDatabaseConfig } from "../src/database.js";
import { rollbackLastMigration, runMigrations } from "../src/migrator.js";

const command = process.argv[2] ?? "migrate";
const pool = createDatabase(readDatabaseConfig());

try {
  if (command === "migrate") {
    await runMigrations(pool);
    process.stdout.write("Database migrations are up to date.\n");
  } else if (command === "rollback") {
    const rolledBack = await rollbackLastMigration(pool);
    process.stdout.write(rolledBack ? "Rolled back one migration.\n" : "No migration to roll back.\n");
  } else {
    throw new Error("Database command must be migrate or rollback.");
  }
} finally {
  await pool.end();
}
