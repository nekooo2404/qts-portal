import assert from "node:assert/strict";
import { test } from "node:test";

import { createPortalService } from "../src/portal-service.js";

const CLIENT = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "client-sub" },
  user: { email: "client@example.com", displayName: "Client Admin" },
  authorization: { tenantId: "tenant-a", role: "client_admin", workspace: "client" },
});

const QTS_ADMIN = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "admin-sub" },
  user: { email: "admin@qts.com.vn", displayName: "QTS Admin" },
  authorization: { tenantId: "qts-vn", role: "qts_admin", workspace: "internal" },
});

function createRepository() {
  const calls = [];
  return {
    calls,
    async createContactRequest(input) {
      calls.push({ method: "createContactRequest", input });
      return { id: "contact-id", status: "NEW" };
    },
    async getOverview(input) {
      calls.push({ method: "getOverview", input });
      return { metrics: {} };
    },
    async listResources(input) {
      calls.push({ method: "listResources", input });
      return { data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
    },
    async createResource(input) {
      calls.push({ method: "createResource", input });
      return { id: "created-id", ...input.data };
    },
    async createTicket(input) {
      calls.push({ method: "createTicket", input });
      return { id: "ticket-id", version: 1, ...input.data };
    },
    async updateResource(input) {
      calls.push({ method: "updateResource", input });
      return { id: input.id, ...input.data };
    },
  };
}

test("dashboard client luôn dùng tenant trong session", async () => {
  const repository = createRepository();
  const service = createPortalService({ repository });

  await service.getOverview({ actor: CLIENT });
  assert.deepEqual(repository.calls[0].input.scope, {
    tenantId: "tenant-a",
    isCrossTenant: false,
  });
  assert.equal(repository.calls[0].input.includeContactRequests, false);

  await service.getOverview({ actor: QTS_ADMIN });
  assert.equal(repository.calls[1].input.includeContactRequests, true);

  await assert.rejects(
    () => service.getOverview({ actor: CLIENT, requestedTenantId: "tenant-b" }),
    (error) => error.code === "TENANT_SCOPE_DENIED",
  );
});

test("yêu cầu liên hệ công khai được validate trước khi ghi", async () => {
  const repository = createRepository();
  const service = createPortalService({ repository });
  const context = { requestId: "request-contact-001", ipAddress: "127.0.0.1" };

  await service.createContactRequest({
    context,
    input: {
      name: "  Nguyễn Minh An  ",
      company: "  Công ty Minh An  ",
      email: "  prospect@example.vn ",
      phone: "  0901 234 567  ",
      service: "software-development",
      message: "Cần kiểm thử ứng dụng trước lần phát hành tiếp theo.",
      consent: true,
    },
  });

  assert.deepEqual(repository.calls[0], {
    method: "createContactRequest",
    input: {
      context,
      data: {
        name: "Nguyễn Minh An",
        company: "Công ty Minh An",
        email: "prospect@example.vn",
        phone: "0901 234 567",
        service: "software-development",
        message: "Cần kiểm thử ứng dụng trước lần phát hành tiếp theo.",
        consent: true,
      },
    },
  });
});

test("client không thể tạo cảnh báo dù tự gọi API", async () => {
  const service = createPortalService({ repository: createRepository() });
  await assert.rejects(
    () => service.createResource({
      actor: CLIENT,
      resource: "alerts",
      input: {
        title: "Cảnh báo giả mạo",
        description: "Không được phép ghi từ client.",
        severity: "CRITICAL",
        source: "client",
        detectedAt: "2026-08-03T08:00:00.000Z",
      },
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );
});

test("qts_admin tạo cảnh báo cho tenant được chọn", async () => {
  const repository = createRepository();
  const service = createPortalService({ repository });

  await service.createResource({
    actor: QTS_ADMIN,
    resource: "alerts",
    input: {
      tenantId: "tenant-a",
      title: "Đăng nhập bất thường",
      description: "SIEM xác nhận sự kiện từ địa chỉ mới.",
      severity: "HIGH",
      source: "SIEM",
      detectedAt: "2026-08-03T08:00:00.000Z",
    },
    context: { requestId: "request-001", ipAddress: "127.0.0.1" },
  });

  const call = repository.calls[0];
  assert.equal(call.input.scope.tenantId, "tenant-a");
  assert.equal(call.input.data.tenantId, "tenant-a");
  assert.equal(call.input.actor.authorization.role, "qts_admin");
});

test("ticket gắn idempotency key và danh tính reporter từ session", async () => {
  const repository = createRepository();
  const service = createPortalService({ repository });

  await service.createResource({
    actor: CLIENT,
    resource: "tickets",
    idempotencyKey: "request-ticket-001",
    input: {
      subject: "Mất kết nối VPN",
      description: "Không thể truy cập VPN từ văn phòng chính.",
      category: "INCIDENT",
      severity: "HIGH",
    },
  });

  const call = repository.calls[0];
  assert.equal(call.method, "createTicket");
  assert.equal(call.input.scope.tenantId, "tenant-a");
  assert.equal(call.input.idempotencyKey, "request-ticket-001");
  assert.deepEqual(call.input.actor.identity, CLIENT.identity);
});

test("client không được thay đổi workflow ticket", async () => {
  const service = createPortalService({ repository: createRepository() });
  await assert.rejects(
    () => service.updateResource({
      actor: CLIENT,
      resource: "tickets",
      id: "ticket-001",
      input: { status: "RESOLVED", expectedVersion: 1 },
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );
});

test("qts_admin có thể mời role nội bộ nhưng client_admin không thể", async () => {
  const invitations = [];
  const membershipRepository = {
    async createInvitation(input) {
      invitations.push(input);
      return { id: "invite-001" };
    },
  };
  const service = createPortalService({
    membershipRepository,
    now: () => Date.parse("2026-08-03T08:00:00.000Z"),
    repository: createRepository(),
  });
  const input = {
    tenantId: "qts-vn",
    email: "soc@qts.com.vn",
    role: "soc_l2",
    expiresAt: "2026-08-10T08:00:00.000Z",
  };

  await service.createInvitation({ actor: QTS_ADMIN, input });
  assert.equal(invitations[0].workspace, "internal");

  await assert.rejects(
    () => service.createInvitation({ actor: CLIENT, input: { ...input, tenantId: "tenant-a" } }),
    (error) => error.code === "PERMISSION_DENIED",
  );
});

test("thu hồi lời mời bắt buộc version và giữ tenant scope của client", async () => {
  const revocations = [];
  const membershipRepository = {
    async revokeInvitation(input) {
      revocations.push(input);
      return { id: input.id, status: "REVOKED", version: input.expectedVersion + 1 };
    },
  };
  const service = createPortalService({
    membershipRepository,
    repository: createRepository(),
  });
  const id = "00000000-0000-4000-8000-000000000001";

  const result = await service.revokeInvitation({
    actor: CLIENT,
    context: { requestId: "request-revoke-001" },
    id,
    input: { status: "REVOKED", expectedVersion: 3 },
  });

  assert.equal(result.status, "REVOKED");
  assert.deepEqual(revocations[0].scope, {
    tenantId: "tenant-a",
    isCrossTenant: false,
  });
  assert.equal(revocations[0].expectedVersion, 3);
  await assert.rejects(
    () => service.revokeInvitation({
      actor: CLIENT,
      id,
      input: { status: "REVOKED" },
    }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});
