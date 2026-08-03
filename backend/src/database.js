import pg from "pg";

const { Pool } = pg;

function readTrimmed(environment, name) {
  const value = environment[name];
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value, defaultValue, name) {
  if (value === "") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either true or false.`);
}

function parseInteger(value, defaultValue, name, minimum, maximum) {
  if (value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

export function readDatabaseConfig(environment = process.env) {
  const nodeEnvironment = readTrimmed(environment, "NODE_ENV") || "development";
  const connectionString = readTrimmed(environment, "QTS_DATABASE_URL");
  if (!connectionString) throw new Error("QTS_DATABASE_URL is required.");

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("QTS_DATABASE_URL must be a valid PostgreSQL URL.");
  }
  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    throw new Error("QTS_DATABASE_URL must be a PostgreSQL URL.");
  }

  const ssl = parseBoolean(
    readTrimmed(environment, "QTS_DATABASE_SSL"),
    nodeEnvironment === "production",
    "QTS_DATABASE_SSL",
  );
  if (nodeEnvironment === "production" && !ssl) {
    throw new Error("QTS_DATABASE_SSL must be true in production.");
  }

  return Object.freeze({
    connectionString,
    ssl,
    poolMax: parseInteger(
      readTrimmed(environment, "QTS_DATABASE_POOL_MAX"),
      10,
      "QTS_DATABASE_POOL_MAX",
      2,
      50,
    ),
    idleTimeoutMs: parseInteger(
      readTrimmed(environment, "QTS_DATABASE_IDLE_TIMEOUT_MS"),
      30_000,
      "QTS_DATABASE_IDLE_TIMEOUT_MS",
      1_000,
      300_000,
    ),
    connectionTimeoutMs: parseInteger(
      readTrimmed(environment, "QTS_DATABASE_CONNECT_TIMEOUT_MS"),
      5_000,
      "QTS_DATABASE_CONNECT_TIMEOUT_MS",
      500,
      60_000,
    ),
  });
}

export function readMigrationDatabaseConfig(environment = process.env) {
  const connectionString = readTrimmed(environment, "QTS_MIGRATION_DATABASE_URL");
  if (!connectionString) return undefined;
  return readDatabaseConfig({
    ...environment,
    QTS_DATABASE_URL: connectionString,
  });
}

export function createDatabase(config) {
  if (!config) throw new Error("Database config is required.");
  return new Pool({
    connectionString: config.connectionString,
    max: config.poolMax,
    idleTimeoutMillis: config.idleTimeoutMs,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    allowExitOnIdle: false,
    ssl: config.ssl ? { rejectUnauthorized: true } : false,
  });
}

export async function checkDatabaseReady(pool) {
  const result = await pool.query("SELECT 1 AS ready");
  return result.rows[0]?.ready === 1;
}

export async function assertRuntimeDatabaseRole(pool, { requireDedicated = false } = {}) {
  const result = await pool.query(
    `SELECT current_user AS role_name, rolsuper, rolbypassrls
     FROM pg_roles
     WHERE rolname = current_user`,
  );
  const role = result.rows[0];
  if (!role) throw new Error("Unable to inspect the PostgreSQL runtime role.");
  if (
    requireDedicated &&
    (role.role_name !== "qts_app" || role.rolsuper === true || role.rolbypassrls === true)
  ) {
    throw new Error(
      "Production QTS_DATABASE_URL must use the qts_app role without SUPERUSER or BYPASSRLS.",
    );
  }
  return role;
}

export async function withDatabaseScope(pool, scope, operation) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE qts_app");
    await client.query(
      "SELECT set_config('qts.tenant_id', $1, true), set_config('qts.internal_access', $2, true)",
      [scope?.tenantId ?? "", scope?.isCrossTenant === true ? "true" : "false"],
    );
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original database error.
    }
    throw error;
  } finally {
    client.release();
  }
}
