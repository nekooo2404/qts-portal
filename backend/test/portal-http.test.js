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
  };
}

async function request(path, { method = "GET", body, headers = {}, portalService } = {}) {
  const server = createServer(createRequestHandler({
    authService: createAuthServiceStub(),
    portalService: portalService ?? createPortalServiceStub(),
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
