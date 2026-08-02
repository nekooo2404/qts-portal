import assert from "node:assert/strict";
import { test } from "node:test";

import { createPostgresExpiringStore } from "../src/auth-store.js";

test("PostgreSQL auth store không lưu raw cookie key", async () => {
  const calls = [];
  const store = createPostgresExpiringStore({
    storeName: "session",
    database: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        return { rows: [], rowCount: 0 };
      },
    },
  });

  await store.set("raw-session-cookie", { tenantId: "tenant-a" }, Date.now() + 60_000);

  const serializedCalls = JSON.stringify(calls);
  assert.equal(serializedCalls.includes("raw-session-cookie"), false);
  assert.match(calls.at(-1).parameters[1], /^[a-f0-9]{64}$/);
});

test("take dùng DELETE RETURNING để giao dịch OIDC chỉ dùng một lần", async () => {
  const calls = [];
  const store = createPostgresExpiringStore({
    storeName: "transaction",
    database: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        return { rows: [{ value: { nonce: "nonce-001" } }], rowCount: 1 };
      },
    },
  });

  assert.deepEqual(await store.take("state-001"), { nonce: "nonce-001" });
  assert.match(calls[0].sql, /DELETE FROM auth_records/i);
  assert.match(calls[0].sql, /RETURNING value/i);
});
