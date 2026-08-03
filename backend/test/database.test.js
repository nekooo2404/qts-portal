import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertRuntimeDatabaseRole,
  readDatabaseConfig,
  readMigrationDatabaseConfig,
} from "../src/database.js";
import { createSecretCipher } from "../src/secret-crypto.js";

test("database config bắt buộc PostgreSQL URL và giới hạn pool", () => {
  assert.throws(
    () => readDatabaseConfig({ NODE_ENV: "development" }),
    /QTS_DATABASE_URL is required/,
  );

  const config = readDatabaseConfig({
    NODE_ENV: "development",
    QTS_DATABASE_URL: "postgresql://qts:local@127.0.0.1:5432/qts_portal",
    QTS_DATABASE_POOL_MAX: "12",
    QTS_DATABASE_SSL: "false",
  });
  assert.equal(config.poolMax, 12);
  assert.equal(config.ssl, false);
  assert.equal(config.connectionString.includes("qts_portal"), true);

  assert.throws(
    () => readDatabaseConfig({
      NODE_ENV: "development",
      QTS_DATABASE_URL: "https://database.example/qts",
    }),
    /PostgreSQL URL/,
  );
});

test("production bắt buộc TLS tới PostgreSQL", () => {
  assert.throws(
    () => readDatabaseConfig({
      NODE_ENV: "production",
      QTS_DATABASE_URL: "postgresql://qts:secret@db.example.com/qts_portal",
      QTS_DATABASE_SSL: "false",
    }),
    /must be true in production/,
  );
});

test("migration URL tách biệt khỏi runtime URL khi được cấu hình", () => {
  const config = readMigrationDatabaseConfig({
    NODE_ENV: "development",
    QTS_DATABASE_URL: "postgresql://qts_app:runtime@db.example/qts_portal",
    QTS_MIGRATION_DATABASE_URL: "postgresql://qts_owner:migrate@db.example/qts_portal",
    QTS_DATABASE_SSL: "false",
  });
  assert.equal(config.connectionString.includes("qts_owner"), true);
  assert.equal(readMigrationDatabaseConfig({}), undefined);
});

test("production từ chối runtime role có thể bypass RLS", async () => {
  const unsafePool = {
    async query() {
      return {
        rows: [{ role_name: "qts", rolsuper: true, rolbypassrls: true }],
      };
    },
  };
  await assert.rejects(
    () => assertRuntimeDatabaseRole(unsafePool, { requireDedicated: true }),
    /qts_app role without SUPERUSER or BYPASSRLS/,
  );

  const safePool = {
    async query() {
      return {
        rows: [{ role_name: "qts_app", rolsuper: false, rolbypassrls: false }],
      };
    },
  };
  assert.equal(
    (await assertRuntimeDatabaseRole(safePool, { requireDedicated: true })).role_name,
    "qts_app",
  );
});

test("AES-256-GCM mã hóa secret với nonce riêng và phát hiện giả mạo", () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  let nonceSeed = 0;
  const cipher = createSecretCipher({
    encodedKey: key,
    randomBytes: (size) => Buffer.alloc(size, nonceSeed++),
  });

  const first = cipher.encrypt("integration-secret-value");
  const second = cipher.encrypt("integration-secret-value");
  assert.notEqual(first, second);
  assert.equal(first.includes("integration-secret-value"), false);
  assert.equal(cipher.decrypt(first), "integration-secret-value");

  const tampered = `${first.slice(0, -1)}${first.endsWith("A") ? "B" : "A"}`;
  assert.throws(() => cipher.decrypt(tampered));
});

test("encryption key phải là đúng 32 byte và không có fallback", () => {
  assert.throws(() => createSecretCipher({ encodedKey: "" }), /required/);
  assert.throws(
    () => createSecretCipher({ encodedKey: Buffer.alloc(16).toString("base64") }),
    /32 bytes/,
  );
});
