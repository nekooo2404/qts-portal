import { createHash } from "node:crypto";

export function createMemoryExpiringStore({
  maxEntries = 10_000,
  now = Date.now,
} = {}) {
  const records = new Map();

  function pruneExpired() {
    const currentTime = now();
    for (const [key, record] of records) {
      if (record.expiresAt <= currentTime) records.delete(key);
    }
  }

  return Object.freeze({
    set(key, value, expiresAt) {
      pruneExpired();
      if (!records.has(key) && records.size >= maxEntries) {
        throw new Error("Authentication store capacity reached.");
      }
      records.set(key, { value, expiresAt });
    },
    get(key) {
      const record = records.get(key);
      if (!record) return undefined;
      if (record.expiresAt <= now()) {
        records.delete(key);
        return undefined;
      }
      return record.value;
    },
    take(key) {
      const value = this.get(key);
      records.delete(key);
      return value;
    },
    delete(key) {
      return records.delete(key);
    },
  });
}

function hashStoreKey(key) {
  if (typeof key !== "string" || key.length === 0) return null;
  return createHash("sha256").update(key).digest("hex");
}

export function createPostgresExpiringStore({ database, storeName } = {}) {
  if (!database || typeof database.query !== "function") {
    throw new Error("PostgreSQL auth store requires a database query interface.");
  }
  if (!new Set(["transaction", "session"]).has(storeName)) {
    throw new Error("PostgreSQL auth store name is invalid.");
  }

  return Object.freeze({
    async set(key, value, expiresAt) {
      const keyHash = hashStoreKey(key);
      if (!keyHash || !Number.isFinite(expiresAt)) {
        throw new Error("Authentication store record is invalid.");
      }
      await database.query(
        "DELETE FROM auth_records WHERE expires_at <= CURRENT_TIMESTAMP",
      );
      await database.query(
        `INSERT INTO auth_records (store_name, key_hash, value, expires_at)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (store_name, key_hash)
         DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
        [storeName, keyHash, JSON.stringify(value), new Date(expiresAt)],
      );
    },

    async get(key) {
      const keyHash = hashStoreKey(key);
      if (!keyHash) return undefined;
      const result = await database.query(
        `SELECT value
         FROM auth_records
         WHERE store_name = $1
           AND key_hash = $2
           AND expires_at > CURRENT_TIMESTAMP`,
        [storeName, keyHash],
      );
      return result.rows[0]?.value;
    },

    async take(key) {
      const keyHash = hashStoreKey(key);
      if (!keyHash) return undefined;
      const result = await database.query(
        `DELETE FROM auth_records
         WHERE store_name = $1
           AND key_hash = $2
           AND expires_at > CURRENT_TIMESTAMP
         RETURNING value`,
        [storeName, keyHash],
      );
      return result.rows[0]?.value;
    },

    async delete(key) {
      const keyHash = hashStoreKey(key);
      if (!keyHash) return false;
      const result = await database.query(
        "DELETE FROM auth_records WHERE store_name = $1 AND key_hash = $2",
        [storeName, keyHash],
      );
      return result.rowCount > 0;
    },
  });
}
