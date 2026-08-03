import assert from "node:assert/strict";
import { test } from "node:test";

import { createMembershipRepository } from "../src/membership-repository.js";

test("createInvitation returns the public camelCase contract", async () => {
  const calls = [];
  const invitation = {
    id: "8f33396c-4a72-4279-a2cf-76f259f8fb07",
    tenantId: "tenant-a",
    email: "client@example.vn",
    role: "client_admin",
    workspace: "client",
    status: "PENDING",
    expiresAt: new Date("2026-08-10T00:00:00.000Z"),
    createdAt: new Date("2026-08-03T00:00:00.000Z"),
  };
  const client = {
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      if (/INSERT INTO invitations/i.test(sql)) {
        return { rows: [invitation], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };
  const repository = createMembershipRepository({
    async connect() {
      return client;
    },
  });

  const result = await repository.createInvitation({
    actor: {
      identity: { issuer: "https://accounts.google.com", subject: "admin-sub" },
      authorization: { role: "qts_admin" },
    },
    context: { requestId: "request-001", ipAddress: "127.0.0.1" },
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    role: invitation.role,
    scope: { tenantId: invitation.tenantId, isCrossTenant: true },
    tenantId: invitation.tenantId,
    workspace: invitation.workspace,
  });

  assert.deepEqual(result, invitation);
  const insert = calls.find(({ sql }) => /INSERT INTO invitations/i.test(sql));
  assert.match(insert.sql, /tenant_id AS "tenantId"/i);
  assert.match(insert.sql, /expires_at AS "expiresAt"/i);
  assert.match(insert.sql, /created_at AS "createdAt"/i);
  assert.equal(Object.hasOwn(result, "tenant_id"), false);
});
