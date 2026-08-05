import assert from "node:assert/strict";
import { test } from "node:test";

import pg from "pg";

import {
  createDatabase,
  readDatabaseConfig,
  withDatabaseScope,
} from "../src/database.js";
import { runMigrations } from "../src/migrator.js";
import { createMembershipRepository } from "../src/membership-repository.js";
import { createPortalRepository } from "../src/portal-repository.js";

const { Client } = pg;
const INTERNAL_SCOPE = Object.freeze({ tenantId: null, isCrossTenant: true });
const CLIENT_SCOPE = Object.freeze({ tenantId: "tenant-a", isCrossTenant: false });
const ACTOR = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "integration-admin" },
  user: { email: "admin@qts.test", displayName: "Integration Admin" },
  authorization: { tenantId: "qts-vn", role: "qts_admin", workspace: "internal" },
});
const CLIENT_ACTOR = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "tenant-a-client" },
  user: { email: "client-a@qts.test", displayName: "Tenant A Client" },
  authorization: { tenantId: "tenant-a", role: "client_admin", workspace: "client" },
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

    const runtimeRole = await withDatabaseScope(database, CLIENT_SCOPE, (client) => client.query(
      `SELECT current_user AS role_name,
              (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_superuser,
              (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypasses_rls,
              row_security_active('alerts'::regclass) AS alerts_rls_active`,
    ));
    assert.deepEqual(runtimeRole.rows[0], {
      role_name: "qts_app",
      is_superuser: false,
      bypasses_rls: false,
      alerts_rls_active: true,
    });

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
    const tenantBAlert = await repository.createResource({
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
    assert.equal("contactRequests" in overview, false);

    const contactRequest = await repository.createContactRequest({
      context: { requestId: "integration-contact-001", ipAddress: "127.0.0.1" },
      data: {
        name: "Nguyễn Minh An",
        company: "Công ty Minh An",
        email: "prospect@example.vn",
        phone: "0901234567",
        service: "it-solutions",
        message: "Cần đánh giá bề mặt tấn công trước đợt phát hành mới.",
        consent: true,
      },
    });
    assert.equal(contactRequest.status, "NEW");

    const internalOverview = await repository.getOverview({
      includeContactRequests: true,
      scope: INTERNAL_SCOPE,
    });
    assert.equal(internalOverview.contactRequests.length, 1);
    assert.equal(internalOverview.contactRequests[0].name, "Nguyễn Minh An");
    assert.equal(internalOverview.contactRequests[0].company, "Công ty Minh An");
    assert.equal(internalOverview.contactRequests[0].phone, "0901234567");
    assert.equal(internalOverview.contactRequests[0].email, "prospect@example.vn");

    const clientContactRows = await withDatabaseScope(database, CLIENT_SCOPE, (client) => (
      client.query("SELECT count(*)::int AS count FROM contact_requests")
    ));
    assert.equal(clientContactRows.rows[0].count, 0);

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

    const concurrentInput = {
      ...ticketInput,
      data: { ...ticketInput.data, subject: "Concurrent idempotency check" },
      idempotencyKey: "integration-ticket-concurrent",
    };
    const [concurrentFirst, concurrentSecond] = await Promise.all([
      repository.createTicket(concurrentInput),
      repository.createTicket(concurrentInput),
    ]);
    assert.equal(concurrentFirst.id, concurrentSecond.id);

    const tenantBTicket = await repository.createTicket({
      ...ticketInput,
      data: { ...ticketInput.data, tenantId: "tenant-b", subject: "Tenant B ticket" },
      idempotencyKey: "integration-ticket-tenant-b",
      scope: { tenantId: "tenant-b", isCrossTenant: true },
    });
    const tenantBDocument = await repository.createDocument({
      actor: ACTOR,
      data: {
        tenantId: "tenant-b",
        type: "SECURITY_REPORT",
        title: "Tenant B report",
        description: undefined,
        filename: "tenant-b.txt",
        mediaType: "text/plain",
        byteSize: 15,
        contentSha256: "f".repeat(64),
        content: Buffer.from("tenant-b-report"),
      },
      scope: { tenantId: "tenant-b", isCrossTenant: true },
    });
    const tenantBIntegration = await repository.createIntegration({
      actor: ACTOR,
      data: {
        tenantId: "tenant-b",
        name: "Tenant B SIEM",
        type: "SIEM",
        endpointUrl: "https://siem.tenant-b.test/events",
      },
      scope: { tenantId: "tenant-b", isCrossTenant: true },
    });
    const member = await withDatabaseScope(database, INTERNAL_SCOPE, async (client) => {
      const result = await client.query(
        `INSERT INTO memberships (
           issuer, subject, tenant_id, role, workspace, email, display_name
         ) VALUES (
           'https://accounts.google.com', 'tenant-b-member', 'tenant-b',
           'client_viewer', 'client', 'member-b@qts.test', 'Tenant B Member'
         ) RETURNING id, version`,
      );
      return result.rows[0];
    });

    const crossTenantOperations = [
      () => repository.getDocument({
        actor: CLIENT_ACTOR,
        id: tenantBDocument.id,
        scope: CLIENT_SCOPE,
      }),
      () => repository.listTicketComments({
        actor: CLIENT_ACTOR,
        id: tenantBTicket.id,
        scope: CLIENT_SCOPE,
      }),
      () => repository.createTicketComment({
        actor: CLIENT_ACTOR,
        data: { body: "Cross-tenant comment must fail", visibility: "CUSTOMER" },
        id: tenantBTicket.id,
        scope: CLIENT_SCOPE,
      }),
      () => repository.updateMember({
        actor: CLIENT_ACTOR,
        data: { role: "technical", expectedVersion: member.version },
        id: member.id,
        scope: CLIENT_SCOPE,
        workspaceForRole: () => "client",
      }),
      () => repository.updateResource({
        actor: CLIENT_ACTOR,
        data: { status: "ACKNOWLEDGED", expectedVersion: tenantBAlert.version },
        id: tenantBAlert.id,
        resource: "alerts",
        scope: CLIENT_SCOPE,
      }),
      () => repository.updateIntegration({
        actor: CLIENT_ACTOR,
        data: { status: "ACTIVE", expectedVersion: tenantBIntegration.version },
        id: tenantBIntegration.id,
        scope: CLIENT_SCOPE,
      }),
    ];
    for (const operation of crossTenantOperations) {
      await assert.rejects(operation, (error) => error.statusCode === 404);
    }

    const membershipRepository = createMembershipRepository(database);
    await withDatabaseScope(database, INTERNAL_SCOPE, (client) => client.query(
      `INSERT INTO invitations (
         id, tenant_id, email, role, workspace, expires_at,
         created_by_issuer, created_by_subject
       ) VALUES
       ('00000000-0000-4000-8000-000000000010', 'tenant-a', 'renew@qts.test',
        'technical', 'client', '2000-01-01T00:00:00.000Z',
        'https://accounts.google.com', 'integration-admin'),
       ('00000000-0000-4000-8000-000000000011', 'tenant-a', 'expired@qts.test',
        'client_viewer', 'client', '2000-01-01T00:00:00.000Z',
        'https://accounts.google.com', 'integration-admin')`,
    ));
    const renewedInvitation = await membershipRepository.createInvitation({
      actor: ACTOR,
      context: { requestId: "integration-invite-renew" },
      email: "renew@qts.test",
      expiresAt: new Date("2099-08-10T00:00:00.000Z"),
      role: "technical",
      scope: { tenantId: "tenant-a", isCrossTenant: true },
      tenantId: "tenant-a",
      workspace: "client",
    });
    assert.equal(renewedInvitation.status, "PENDING");
    assert.equal(renewedInvitation.version, 1);
    const invitationList = await repository.listInvitations({
      actor: ACTOR,
      query: { page: 1, pageSize: 100, filters: {} },
      scope: INTERNAL_SCOPE,
    });
    const expiredInvitation = invitationList.data.find(
      ({ id }) => id === "00000000-0000-4000-8000-000000000011",
    );
    assert.equal(expiredInvitation.status, "EXPIRED");
    assert.equal(expiredInvitation.version, 2);

    const revocableInvitation = await membershipRepository.createInvitation({
      actor: ACTOR,
      context: { requestId: "integration-invite-revoke-create" },
      email: "revoke@qts.test",
      expiresAt: new Date("2099-08-10T00:00:00.000Z"),
      role: "client_admin",
      scope: { tenantId: "tenant-a", isCrossTenant: true },
      tenantId: "tenant-a",
      workspace: "client",
    });
    const revokedInvitation = await membershipRepository.revokeInvitation({
      actor: ACTOR,
      context: { requestId: "integration-invite-revoke" },
      expectedVersion: revocableInvitation.version,
      id: revocableInvitation.id,
      scope: { tenantId: "tenant-a", isCrossTenant: true },
    });
    assert.equal(revokedInvitation.status, "REVOKED");
    assert.equal(revokedInvitation.version, 2);
    assert.ok(revokedInvitation.revokedAt);
    await assert.rejects(
      () => membershipRepository.revokeInvitation({
        actor: ACTOR,
        expectedVersion: revocableInvitation.version,
        id: revocableInvitation.id,
        scope: { tenantId: "tenant-a", isCrossTenant: true },
      }),
      (error) => error.code === "VERSION_CONFLICT",
    );
    assert.equal(await membershipRepository.resolve({
      claims: {
        iss: "https://accounts.google.com",
        sub: "revoked-invitation-subject",
        email: "revoke@qts.test",
      },
    }), undefined);

    const internalInvitation = await membershipRepository.createInvitation({
      actor: ACTOR,
      context: { requestId: "integration-internal-invite" },
      email: "internal@qts.test",
      expiresAt: new Date("2099-08-10T00:00:00.000Z"),
      role: "soc_l1",
      scope: { tenantId: "tenant-a", isCrossTenant: true },
      tenantId: "tenant-a",
      workspace: "internal",
    });
    const clientInvitations = await repository.listInvitations({
      actor: CLIENT_ACTOR,
      query: { page: 1, pageSize: 100, filters: {} },
      scope: CLIENT_SCOPE,
    });
    assert.equal(clientInvitations.data.some(({ id }) => id === internalInvitation.id), false);
    await assert.rejects(
      () => membershipRepository.revokeInvitation({
        actor: CLIENT_ACTOR,
        expectedVersion: internalInvitation.version,
        id: internalInvitation.id,
        scope: CLIENT_SCOPE,
      }),
      (error) => error.code === "PERMISSION_DENIED",
    );

    const acceptedInvitation = await membershipRepository.createInvitation({
      actor: ACTOR,
      context: { requestId: "integration-accepted-invite" },
      email: "accepted@qts.test",
      expiresAt: new Date("2099-08-10T00:00:00.000Z"),
      role: "client_viewer",
      scope: { tenantId: "tenant-a", isCrossTenant: true },
      tenantId: "tenant-a",
      workspace: "client",
    });
    const acceptedMembership = await membershipRepository.resolve({
      claims: {
        iss: "https://accounts.google.com",
        sub: "accepted-invitation-subject",
        email: "accepted@qts.test",
        name: "Accepted Client",
      },
    });
    assert.equal(acceptedMembership.tenantId, "tenant-a");
    const acceptedStatus = await withDatabaseScope(
      database,
      INTERNAL_SCOPE,
      (client) => client.query(
        "SELECT status, version FROM invitations WHERE id = $1",
        [acceptedInvitation.id],
      ),
    );
    assert.deepEqual(acceptedStatus.rows[0], { status: "ACCEPTED", version: 2 });

    const storedSession = {
      identity: {
        issuer: "https://accounts.google.com",
        subject: "tenant-b-member",
      },
      authorization: {
        tenantId: "tenant-b",
        role: "client_viewer",
        workspace: "client",
      },
    };
    assert.equal(await membershipRepository.validateSession(storedSession), true);
    await withDatabaseScope(database, INTERNAL_SCOPE, (client) => client.query(
      `INSERT INTO auth_records (store_name, key_hash, value, expires_at)
       VALUES ('session', $1, $2::jsonb, CURRENT_TIMESTAMP + INTERVAL '1 hour')`,
      ["a".repeat(64), JSON.stringify(storedSession)],
    ));
    const tenantBVersion = await withDatabaseScope(
      database,
      INTERNAL_SCOPE,
      async (client) => {
        const result = await client.query("SELECT version FROM tenants WHERE id = 'tenant-b'");
        return result.rows[0].version;
      },
    );
    const suspendedTenant = await repository.updateResource({
      actor: ACTOR,
      context: { requestId: "integration-suspend-tenant-b" },
      data: { status: "SUSPENDED", expectedVersion: tenantBVersion },
      id: "tenant-b",
      resource: "tenants",
      scope: INTERNAL_SCOPE,
    });
    assert.equal(suspendedTenant.status, "SUSPENDED");
    assert.equal(await membershipRepository.validateSession(storedSession), false);
    assert.equal(await membershipRepository.resolve({
      claims: {
        iss: storedSession.identity.issuer,
        sub: storedSession.identity.subject,
        email: "member-b@qts.test",
      },
    }), undefined);
    const remainingSessions = await withDatabaseScope(
      database,
      INTERNAL_SCOPE,
      (client) => client.query(
        `SELECT count(*)::int AS count
         FROM auth_records
         WHERE store_name = 'session'
           AND value->'authorization'->>'tenantId' = 'tenant-b'`,
      ),
    );
    assert.equal(remainingSessions.rows[0].count, 0);
    const revocationAudit = await withDatabaseScope(
      database,
      INTERNAL_SCOPE,
      (client) => client.query(
        `SELECT metadata
         FROM audit_events
         WHERE action = 'tenants.update' AND resource_id = 'tenant-b'`,
      ),
    );
    assert.equal(revocationAudit.rows[0].metadata.revokedSessionCount, 1);

    const audit = await withDatabaseScope(database, INTERNAL_SCOPE, (client) => client.query(
      `SELECT count(*)::int AS count,
              count(*) FILTER (WHERE action = 'contact_requests.create')::int AS contact_count
       FROM audit_events`,
    ));
    assert.equal(audit.rows[0].count, 15);
    assert.equal(audit.rows[0].contact_count, 1);
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
