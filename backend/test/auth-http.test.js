import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, test } from "node:test";

import {
  createLoginRateLimiter,
  createRequestHandler,
  resolveClientAddress,
} from "../src/app.js";

const servers = new Set();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
  servers.clear();
});

async function request(
  path,
  { authService, headers, loginRateLimiter, method = "GET" } = {},
) {
  const server = createServer(
    createRequestHandler({
      authService,
      loginRateLimiter,
    }),
  );
  servers.add(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");

  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    headers,
    method,
    redirect: "manual",
  });
}

function createAuthServiceStub() {
  return {
    configured: true,
    transactionCookieName: "__Secure-qts_oidc_tx",
    sessionCookieName: "__Host-qts_session",
    getStatus() {
      return { configured: true, provider: "google" };
    },
    async beginGoogleLogin() {
      return {
        authorizationUrl: new URL("https://accounts.google.com/o/oauth2/v2/auth"),
        transactionCookie:
          "__Secure-qts_oidc_tx=state-001; Path=/api/v1/auth/callback/google; HttpOnly; Secure; SameSite=Lax",
      };
    },
    async completeGoogleLogin() {
      return {
        redirectTo: "/admin/soc",
        transactionCookie:
          "__Secure-qts_oidc_tx=; Path=/api/v1/auth/callback/google; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
        sessionCookie:
          "__Host-qts_session=session-001; Path=/; HttpOnly; Secure; SameSite=Lax",
      };
    },
    getSession() {
      return {
        user: { email: "security@qts.com.vn", displayName: "QTS Security" },
        authorization: {
          tenantId: "qts-vietnam",
          role: "qts_admin",
          workspace: "internal",
        },
        csrfToken: "csrf-001",
        expiresAt: "2026-08-03T16:00:00.000Z",
      };
    },
    logout() {},
    createExpiredSessionCookie() {
      return "__Host-qts_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
    },
  };
}

test("GET /api/v1/auth/status không làm lộ cấu hình nhạy cảm", async () => {
  const response = await request("/api/v1/auth/status", {
    authService: createAuthServiceStub(),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { configured: true, provider: "google" },
  });
});

test("GET login chuyển hướng tới Google và đặt cookie giao dịch", async () => {
  const response = await request(
    "/api/v1/auth/login/google?returnTo=%2Fadmin%2Fsoc",
    { authService: createAuthServiceStub() },
  );

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
});

test("GET login trả 429 khi vượt giới hạn khởi tạo giao dịch", async () => {
  const response = await request("/api/v1/auth/login/google", {
    authService: createAuthServiceStub(),
    loginRateLimiter: {
      allow: () => false,
      retryAfterSeconds: () => 120,
    },
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "120");
  assert.deepEqual(await response.json(), {
    error: {
      code: "AUTH_RATE_LIMITED",
      message: "Có quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.",
    },
  });
});

test("rate limiter từ chối cấu hình có thể làm vòng lặp hoặc vô hiệu giới hạn", () => {
  assert.throws(
    () => createLoginRateLimiter({ maxClients: 0 }),
    /positive integers/,
  );
});

test("chỉ tin X-Forwarded-For khi số trusted proxy hop được cấu hình", () => {
  const request = {
    headers: { "x-forwarded-for": "198.51.100.10, 10.0.0.8" },
    socket: { remoteAddress: "127.0.0.1" },
  };

  assert.equal(resolveClientAddress(request, 0), "127.0.0.1");
  assert.equal(resolveClientAddress(request, 1), "10.0.0.8");
  assert.equal(resolveClientAddress(request, 2), "198.51.100.10");
});

test("GET callback đặt session cookie và xóa cookie giao dịch", async () => {
  const response = await request(
    "/api/v1/auth/callback/google?code=code-001&state=state-001",
    {
      authService: createAuthServiceStub(),
      headers: { Cookie: "__Secure-qts_oidc_tx=state-001" },
    },
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/admin/soc");
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /Max-Age=0/);
  assert.match(cookies[1], /^__Host-qts_session=/);
});

test("GET session chỉ trả dữ liệu QTS đã rút gọn", async () => {
  const response = await request("/api/v1/auth/session", {
    authService: createAuthServiceStub(),
    headers: { Cookie: "__Host-qts_session=session-001" },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.authorization.role, "qts_admin");
  assert.equal(body.data.authorization.tenantId, "qts-vietnam");
  assert.equal("idToken" in body.data, false);
  assert.equal("accessToken" in body.data, false);
});

test("GET session xóa cookie không còn hợp lệ", async () => {
  const authService = {
    ...createAuthServiceStub(),
    getSession() {
      throw {
        statusCode: 401,
        code: "SESSION_REQUIRED",
        publicMessage: "Phiên đăng nhập không tồn tại hoặc đã hết hạn.",
      };
    },
  };
  const response = await request("/api/v1/auth/session", {
    authService,
    headers: { Cookie: "__Host-qts_session=expired-session" },
  });

  assert.equal(response.status, 401);
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("POST logout chuyển CSRF token tới auth service và xóa cookie", async () => {
  let logoutArguments;
  const authService = {
    ...createAuthServiceStub(),
    logout(...args) {
      logoutArguments = args;
    },
  };
  const response = await request("/api/v1/auth/logout", {
    authService,
    method: "POST",
    headers: {
      Cookie: "__Host-qts_session=session-001",
      "X-CSRF-Token": "csrf-001",
    },
  });

  assert.equal(response.status, 204);
  assert.deepEqual(logoutArguments, ["session-001", "csrf-001"]);
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
});
