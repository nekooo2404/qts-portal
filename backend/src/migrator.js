import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MIGRATIONS_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
);
const LOCK_NAME = "qts_portal_schema_migrations";

async function migrationFiles(directory, direction) {
  const suffix = `.${direction}.sql`;
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();
}

function versionOf(filename) {
  return filename.split("_", 1)[0];
}

function checksum(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(32) PRIMARY KEY,
      filename TEXT NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function runMigrations(pool, { directory = DEFAULT_MIGRATIONS_DIRECTORY } = {}) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_NAME]);
    await ensureMigrationTable(client);
    const files = await migrationFiles(directory, "up");

    for (const filename of files) {
      const version = versionOf(filename);
      const sql = await readFile(join(directory, filename), "utf8");
      const digest = checksum(sql);
      const existing = await client.query(
        "SELECT checksum FROM schema_migrations WHERE version = $1",
        [version],
      );
      if (existing.rowCount > 0) {
        if (existing.rows[0].checksum !== digest) {
          throw new Error(`Applied migration ${version} has a different checksum.`);
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version, filename, checksum) VALUES ($1, $2, $3)",
          [version, filename, digest],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_NAME]);
    } finally {
      client.release();
    }
  }
}

export async function rollbackLastMigration(
  pool,
  { directory = DEFAULT_MIGRATIONS_DIRECTORY } = {},
) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_NAME]);
    await ensureMigrationTable(client);
    const latest = await client.query(
      "SELECT version, filename FROM schema_migrations ORDER BY applied_at DESC, version DESC LIMIT 1",
    );
    if (latest.rowCount === 0) return false;

    const { version, filename } = latest.rows[0];
    const downFilename = filename.replace(/\.up\.sql$/, ".down.sql");
    const downFiles = await migrationFiles(directory, "down");
    if (!downFiles.includes(downFilename)) {
      throw new Error(`Rollback migration is missing for ${filename}.`);
    }
    const sql = await readFile(join(directory, downFilename), "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("DELETE FROM schema_migrations WHERE version = $1", [version]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    return true;
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_NAME]);
    } finally {
      client.release();
    }
  }
}
