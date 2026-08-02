import assert from "node:assert/strict";
import { test } from "node:test";

import pg from "pg";

import {
  createDatabase,
  readDatabaseConfig,
  withDatabaseScope,
} from "../src/database.js";
import { runMigrations } from "../src/migrator.js";
import { createPortalRepository } from "../src/portal-repository.js";

const { Client } = pg;
const INTERNAL_SCOPE = Object.freeze({ tenantId: null, isCrossTenant: true });
const CLIENT_SCOPE = Object.freeze({ tenantId: "tenant-a", isCrossTenant: false });
const ACTOR = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "integration-admin" },
  user: { email: "admin@qts.test", displayName: "Integration Admin" },
  authorization: { tenantId: "qts-vn", role: "qts_admin", workspace: "internal" },
});

function databaseUrls() {
  const configured = new URL(process.env.QTS_DATABASE_URL);
  const databaseName = `qts_portal_test_${process.pid}`;
  const admin = new URL(configured);
  admin.pathname = "/postgres";
  const testDatabase = new URL(configured);
  testDatabase.pathname = `/${databaseName}`;
  return { adminUrl: admin.href, databaseName, testUrl: testDatabase.href };
}

test("PostgreSQL repository giữ tenant isolation, idempotency và audit", async () => {
  const { adminUrl, databaseName, testUrl } = databaseUrls();
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${databaseName}`);

  const database = createDatabase(readDatabaseConfig({
    NODE_ENV: "test",
    QTS_DATABASE_URL: testUrl,
    QTS_DATABASE_SSL: "false",
  }));

  try {
    await runMigrations(database);
    await withDatabaseScope(database, INTERNAL_SCOPE, (client) => client.query(
      `INSERT INTO tenants (id, name, sla_high_minutes)
       VALUES ('tenant-a', 'Tenant A', 60), ('tenant-b', 'Tenant B', 120)`,
    ));

    const repository = createPortalRepository(database);
    const baseAlert = {
      externalRef: undefined,
      title: "Đăng nhập bất thường",
      description: "Sự kiện thật do test integration ghi vào database tạm.",
      severity: "HIGH",
      source: "SIEM",
      assetId: undefined,
      detectedAt: "2026-08-03T08:00:00.000Z",
    };
    await repository.createResource({
      actor: ACTOR,
      data: { ...baseAlert, tenantId: "tenant-a" },
      resource: "alerts",
      scope: { tenantId: "tenant-a", isCrossTenant: true },
    });
    await repository.createResource({
      actor: ACTOR,
      data: { ...baseAlert, title: "Tenant B alert", tenantId: "tenant-b" },
      resource: "alerts",
      scope: { tenantId: "tenant-b", isCrossTenant: true },
    });

    const clientAlerts = await repository.listResources({
      resource: "alerts",
      scope: CLIENT_SCOPE,
      query: {
        page: 1,
        pageSize: 20,
        search: "",
        sortBy: "detectedAt",
        sortOrder: "desc",
        filters: {},
      },
    });
    assert.equal(clientAlerts.pagination.totalItems, 1);
    assert.equal(clientAlerts.data[0].tenantId, "tenant-a");

    const overview = await repository.getOverview({ scope: CLIENT_SCOPE });
    assert.equal(overview.metrics.openAlerts, 1);
    assert.equal(overview.metrics.totalAssets, 0);

    const ticketInput = {
      actor: ACTOR,
      data: {
        tenantId: "tenant-a",
        subject: "VPN không kết nối",
        description: "Không thể kết nối VPN tại văn phòng.",
        category: "INCIDENT",
        severity: "HIGH",
      },
      idempotencyKey: "integration-ticket-001",
      scope: { tenantId: "tenant-a", isCrossTenant: true },
    };
    const firstTicket = await repository.createTicket(ticketInput);
    const repeatedTicket = await repository.createTicket(ticketInput);
    assert.equal(repeatedTicket.id, firstTicket.id);
    assert.equal(firstTicket.slaMinutes, 60);
    assert.ok(firstTicket.dueAt);

    await assert.rejects(
      () => repository.createTicket({
        ...ticketInput,
        data: { ...ticketInput.data, subject: "Nội dung khác" },
      }),
      (error) => error.code === "IDEMPOTENCY_CONFLICT" && error.statusCode === 409,
    );

    const audit = await withDatabaseScope(database, INTERNAL_SCOPE, (client) => client.query(
      "SELECT count(*)::int AS count FROM audit_events",
    ));
    assert.equal(audit.rows[0].count, 3);
    await assert.rejects(
      () => withDatabaseScope(database, INTERNAL_SCOPE, (client) => client.query(
        "DELETE FROM audit_events",
      )),
      /append-only/,
    );
  } finally {
    await database.end();
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1",
      [databaseName],
    );
    await admin.query(`DROP DATABASE ${databaseName}`);
    await admin.end();
  }
});
