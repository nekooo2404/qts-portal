import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, test } from "node:test";

import { createRequestHandler } from "../src/app.js";

const servers = new Set();
const ACTOR = Object.freeze({
  identity: { issuer: "https://accounts.google.com", subject: "admin-sub" },
  user: { email: "admin@qts.com.vn", displayName: "QTS Admin" },
  authorization: { tenantId: "qts-vn", role: "qts_admin", workspace: "internal" },
  csrfToken: "csrf-001",
  expiresAt: Date.now() + 60_000,
});

afterEach(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
  servers.clear();
});

function createAuthServiceStub() {
  return {
    configured: true,
    transactionCookieName: "qts_oidc_tx",
    sessionCookieName: "qts_session",
    getStatus: () => ({ configured: true, provider: "google" }),
    async authenticateSession(sessionId, csrfToken) {
      if (sessionId !== "session-001") {
        throw { statusCode: 401, code: "SESSION_REQUIRED", publicMessage: "Cần đăng nhập." };
      }
      if (csrfToken !== undefined && csrfToken !== ACTOR.csrfToken) {
        throw { statusCode: 403, code: "INVALID_CSRF_TOKEN", publicMessage: "CSRF token không hợp lệ." };
      }
      return ACTOR;
    },
  };
}

function createPortalServiceStub() {
  const calls = [];
  return {
    calls,
    async createContactRequest(input) {
      calls.push({ method: "createContactRequest", input });
      return {
        id: "contact-001",
        status: "NEW",
        createdAt: "2026-08-03T08:00:00.000Z",
      };
    },
    async getOverview(input) {
      calls.push({ method: "getOverview", input });
      return { metrics: { openAlerts: 0 }, generatedAt: "2026-08-03T08:00:00.000Z" };
    },
    async listResources(input) {
      calls.push({ method: "listResources", input });
      return { data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
    },
    async createResource(input) {
      calls.push({ method: "createResource", input });
      return { id: "ticket-001" };
    },
    async updateResource(input) {
      calls.push({ method: "updateResource", input });
      return { id: input.id, version: 2 };
    },
    async getDocument(input) {
      calls.push({ method: "getDocument", input });
      return {
        filename: "bao-cao.pdf",
        mediaType: "application/pdf",
        contentSha256: "a".repeat(64),
        content: Buffer.from("%PDF-test"),
      };
    },
    async revokeInvitation(input) {
      calls.push({ method: "revokeInvitation", input });
      return { id: input.id, status: "REVOKED", version: 2 };
    },
  };
}

async function request(
  path,
  { method = "GET", body, headers = {}, portalService, handlerOptions = {} } = {},
) {
  const server = createServer(createRequestHandler({
    authService: createAuthServiceStub(),
    portalService: portalService ?? createPortalServiceStub(),
    ...handlerOptions,
  }));
  servers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Cookie: "qts_session=session-001",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    method,
  });
}

test("POST contact request không cần session và chuyển context vào service", async () => {
  const portalService = createPortalServiceStub();
  const response = await request("/api/v1/contact-requests", {
    method: "POST",
    body: {
      name: "Nguyễn Minh An",
      company: "Công ty Minh An",
      email: "prospect@example.vn",
      phone: "0901234567",
      service: "it-solutions",
      message: "Cần đánh giá bề mặt tấn công trước đợt phát hành mới.",
      consent: true,
    },
    headers: { Cookie: "" },
    portalService,
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: {
      id: "contact-001",
      status: "NEW",
      createdAt: "2026-08-03T08:00:00.000Z",
    },
  });
  const call = portalService.calls[0];
  assert.equal(call.method, "createContactRequest");
  assert.equal(call.input.input.name, "Nguyễn Minh An");
  assert.equal(call.input.input.phone, "0901234567");
  assert.equal(call.input.input.email, "prospect@example.vn");
  assert.match(call.input.context.requestId, /^[A-Za-z0-9-]{8,64}$/);
});

test("POST contact request áp dụng rate limit riêng", async () => {
  const portalService = createPortalServiceStub();
  const response = await request("/api/v1/contact-requests", {
    method: "POST",
    body: {
      name: "Nguyễn Minh An",
      company: "Công ty Minh An",
      email: "prospect@example.vn",
      phone: "0901234567",
      service: "it-solutions",
      message: "Cần đánh giá bề mặt tấn công trước đợt phát hành mới.",
      consent: true,
    },
    handlerOptions: {
      contactRateLimiter: {
        allow: () => false,
        retryAfterSeconds: () => 60,
      },
    },
    portalService,
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(portalService.calls.length, 0);
});

test("GET overview bắt buộc session và trả request id", async () => {
  const portalService = createPortalServiceStub();
  const response = await request("/api/v1/portal/overview?tenantId=tenant-a", { portalService });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("x-request-id"), /^[A-Za-z0-9-]{8,64}$/);
  assert.deepEqual(await response.json(), {
    data: { metrics: { openAlerts: 0 }, generatedAt: "2026-08-03T08:00:00.000Z" },
  });
  assert.equal(portalService.calls[0].input.requestedTenantId, "tenant-a");
});

test("POST ticket chuyển CSRF, idempotency và actor đã xác thực", async () => {
  const portalService = createPortalServiceStub();
  const response = await request("/api/v1/portal/tickets", {
    method: "POST",
    body: {
      subject: "Mất kết nối VPN",
      description: "Không thể kết nối VPN từ văn phòng.",
      category: "INCIDENT",
      severity: "HIGH",
    },
    headers: {
      "Idempotency-Key": "ticket-request-001",
      "X-CSRF-Token": "csrf-001",
    },
    portalService,
  });

  assert.equal(response.status, 201);
  const call = portalService.calls[0];
  assert.equal(call.input.actor.authorization.role, "qts_admin");
  assert.equal(call.input.idempotencyKey, "ticket-request-001");
  assert.match(call.input.context.requestId, /^[A-Za-z0-9-]{8,64}$/);
});

test("mutation từ chối CSRF sai trước khi gọi portal service", async () => {
  const portalService = createPortalServiceStub();
  const response = await request("/api/v1/portal/alerts", {
    method: "POST",
    body: { title: "Không được ghi" },
    headers: { "X-CSRF-Token": "wrong" },
    portalService,
  });

  assert.equal(response.status, 403);
  assert.equal(portalService.calls.length, 0);
});

test("PATCH invitation chuyển yêu cầu thu hồi đã xác thực vào service", async () => {
  const portalService = createPortalServiceStub();
  const id = "00000000-0000-4000-8000-000000000001";
  const response = await request(`/api/v1/portal/invitations/${id}`, {
    method: "PATCH",
    body: { status: "REVOKED", expectedVersion: 1 },
    headers: { "X-CSRF-Token": "csrf-001" },
    portalService,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { id, status: "REVOKED", version: 2 },
  });
  const call = portalService.calls[0];
  assert.equal(call.method, "revokeInvitation");
  assert.deepEqual(call.input.input, { status: "REVOKED", expectedVersion: 1 });
  assert.equal(call.input.actor.authorization.role, "qts_admin");
});

test("download tài liệu trả binary và checksum", async () => {
  const response = await request(
    "/api/v1/portal/documents/00000000-0000-4000-8000-000000000001/download",
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition"), /bao-cao\.pdf/);
  assert.equal(response.headers.get("digest"), `sha-256=${"a".repeat(64)}`);
  assert.equal(Buffer.from(await response.arrayBuffer()).toString(), "%PDF-test");
});
