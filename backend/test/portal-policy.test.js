import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertPermission,
  resolveTenantScope,
} from "../src/portal-policy.js";

const CLIENT_ADMIN = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "client-sub" },
  authorization: {
    tenantId: "tenant-a",
    role: "client_admin",
    workspace: "client",
  },
});

const CLIENT_VIEWER = Object.freeze({
  ...CLIENT_ADMIN,
  authorization: {
    ...CLIENT_ADMIN.authorization,
    role: "client_viewer",
  },
});

const QTS_ADMIN = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "admin-sub" },
  authorization: {
    tenantId: "qts-vn",
    role: "qts_admin",
    workspace: "internal",
  },
});

test("client chỉ nhận tenant scope từ session", () => {
  assert.deepEqual(resolveTenantScope(CLIENT_ADMIN), {
    tenantId: "tenant-a",
    isCrossTenant: false,
  });
  assert.throws(
    () => resolveTenantScope(CLIENT_ADMIN, "tenant-b"),
    (error) => error.code === "TENANT_SCOPE_DENIED" && error.statusCode === 403,
  );
});

test("role nội bộ có thể truy vấn toàn cục hoặc chọn một tenant", () => {
  assert.deepEqual(resolveTenantScope(QTS_ADMIN), {
    tenantId: null,
    isCrossTenant: true,
  });
  assert.deepEqual(resolveTenantScope(QTS_ADMIN, "tenant-a"), {
    tenantId: "tenant-a",
    isCrossTenant: true,
  });
});

test("client_viewer chỉ đọc và không được tạo ticket", () => {
  assert.doesNotThrow(() => assertPermission(CLIENT_VIEWER, "tickets.read"));
  assert.throws(
    () => assertPermission(CLIENT_VIEWER, "tickets.create"),
    (error) => error.code === "PERMISSION_DENIED" && error.statusCode === 403,
  );
});

test("qts_admin có đầy đủ quyền portal", () => {
  for (const permission of [
    "tenants.write",
    "alerts.write",
    "tickets.manage",
    "assets.write",
    "billing.write",
    "documents.write",
    "integrations.write",
    "members.write",
    "shifts.write",
    "audit.read",
  ]) {
    assert.doesNotThrow(() => assertPermission(QTS_ADMIN, permission));
  }
});
