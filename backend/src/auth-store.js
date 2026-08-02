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
