import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createAuthService,
  validateGoogleClaims,
} from "../src/auth-service.js";

const NOW = Date.parse("2026-08-03T08:00:00.000Z");

function createConfig(overrides = {}) {
  return {
    enabled: true,
    provider: "google",
    issuer: "https://accounts.google.com",
    clientId: "google-client-id.apps.googleusercontent.com",
    clientSecret: "google-client-secret",
    publicOrigin: "https://portal.qts.com.vn",
    redirectUri: "https://portal.qts.com.vn/api/v1/auth/callback/google",
    hostedDomain: "qts.com.vn",
    cookieSecure: true,
    transactionTtlMs: 10 * 60 * 1000,
    sessionTtlMs: 8 * 60 * 60 * 1000,
    memberships: [
      {
        issuer: "https://accounts.google.com",
        subject: "google-subject-001",
        tenantId: "qts-vietnam",
        role: "client_admin",
        workspace: "client",
      },
    ],
    ...overrides,
  };
}

function createOidcClient(claimOverrides = {}) {
  const calls = [];
  return {
    calls,
    async createAuthorizationRequest(parameters) {
      calls.push({ method: "createAuthorizationRequest", parameters });
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        client_id: "google-client-id.apps.googleusercontent.com",
        redirect_uri: parameters.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state: "state-001",
        nonce: "nonce-001",
        code_challenge: "challenge-001",
        code_challenge_method: "S256",
      }).toString();
      return {
        url,
        state: "state-001",
        nonce: "nonce-001",
        codeVerifier: "verifier-001",
      };
    },
    async completeAuthorization(parameters) {
      calls.push({ method: "completeAuthorization", parameters });
      return {
        iss: "https://accounts.google.com",
        sub: "google-subject-001",
        aud: "google-client-id.apps.googleusercontent.com",
        exp: Math.floor(NOW / 1000) + 300,
        nonce: "nonce-001",
        email: "security@qts.com.vn",
        email_verified: true,
        hd: "qts.com.vn",
        name: "QTS Security",
        ...claimOverrides,
      };
    },
  };
}

test("login tạo giao dịch một lần và yêu cầu state, nonce, PKCE S256", async () => {
  const oidcClient = createOidcClient();
  const auth = createAuthService({
    config: createConfig(),
    oidcClient,
    now: () => NOW,
  });

  const result = await auth.beginGoogleLogin({ returnTo: "/client/overview" });

  assert.equal(result.authorizationUrl.searchParams.get("scope"), "openid email profile");
  assert.equal(result.authorizationUrl.searchParams.get("state"), "state-001");
  assert.equal(result.authorizationUrl.searchParams.get("nonce"), "nonce-001");
  assert.equal(result.authorizationUrl.searchParams.get("code_challenge_method"), "S256");
  assert.equal(result.authorizationUrl.searchParams.has("client_secret"), false);
  assert.match(result.transactionCookie, /HttpOnly/);
  assert.match(result.transactionCookie, /Secure/);
  assert.match(result.transactionCookie, /SameSite=Lax/);
});

test("callback ánh xạ bằng iss + sub, phát session opaque và không giữ Google token", async () => {
  const oidcClient = createOidcClient();
  const auth = createAuthService({
    config: createConfig(),
    oidcClient,
    now: () => NOW,
  });
  const login = await auth.beginGoogleLogin({ returnTo: "/client/overview" });

  const result = await auth.completeGoogleLogin({
    callbackUrl: new URL(
      "https://portal.qts.com.vn/api/v1/auth/callback/google?code=code-001&state=state-001",
    ),
    transactionCookie: "state-001",
  });

  assert.equal(result.redirectTo, "/client/overview");
  assert.match(result.sessionCookie, /^__Host-qts_session=/);
  assert.match(result.sessionCookie, /HttpOnly/);
  assert.match(result.sessionCookie, /Secure/);
  assert.match(result.sessionCookie, /SameSite=Lax/);
  assert.doesNotMatch(result.sessionCookie, /code-001|google-subject-001/);

  const sessionId = result.sessionCookie.match(/^__Host-qts_session=([^;]+)/)?.[1];
  assert.ok(sessionId);
  const session = auth.getSession(sessionId);
  assert.deepEqual(session.user, {
    email: "security@qts.com.vn",
    displayName: "QTS Security",
  });
  assert.deepEqual(session.authorization, {
    tenantId: "qts-vietnam",
    role: "client_admin",
    workspace: "client",
  });
  assert.equal("subject" in session, false);
  assert.equal("idToken" in session, false);
  assert.equal("accessToken" in session, false);
});

test("callback từ chối state không khớp trước khi đổi authorization code", async () => {
  const oidcClient = createOidcClient();
  const auth = createAuthService({
    config: createConfig(),
    oidcClient,
    now: () => NOW,
  });
  await auth.beginGoogleLogin({ returnTo: "/" });

  await assert.rejects(
    () =>
      auth.completeGoogleLogin({
        callbackUrl: new URL(
          "https://portal.qts.com.vn/api/v1/auth/callback/google?code=code-001&state=wrong-state",
        ),
        transactionCookie: "state-001",
      }),
    (error) => error.code === "INVALID_AUTH_TRANSACTION",
  );
  assert.equal(
    oidcClient.calls.filter((call) => call.method === "completeAuthorization").length,
    0,
  );
});

test("callback từ chối danh tính chưa được ánh xạ", async () => {
  const oidcClient = createOidcClient({ sub: "unprovisioned-subject" });
  const auditEvents = [];
  const auth = createAuthService({
    config: createConfig(),
    oidcClient,
    now: () => NOW,
    audit: (event) => auditEvents.push(event),
  });
  await auth.beginGoogleLogin({ returnTo: "/" });

  await assert.rejects(
    () =>
      auth.completeGoogleLogin({
        callbackUrl: new URL(
          "https://portal.qts.com.vn/api/v1/auth/callback/google?code=code-001&state=state-001",
        ),
        transactionCookie: "state-001",
      }),
    (error) => error.code === "MEMBERSHIP_NOT_FOUND" && error.statusCode === 403,
  );
  assert.deepEqual(auditEvents, [
    {
      event: "auth_membership_not_found",
      issuer: "https://accounts.google.com",
      subject: "unprovisioned-subject",
      email: "security@qts.com.vn",
    },
  ]);
});

test("logout yêu cầu CSRF token và thu hồi session phía server", async () => {
  const auth = createAuthService({
    config: createConfig(),
    oidcClient: createOidcClient(),
    now: () => NOW,
  });
  await auth.beginGoogleLogin({ returnTo: "/" });
  const login = await auth.completeGoogleLogin({
    callbackUrl: new URL(
      "https://portal.qts.com.vn/api/v1/auth/callback/google?code=code-001&state=state-001",
    ),
    transactionCookie: "state-001",
  });
  const sessionId = login.sessionCookie.match(/^__Host-qts_session=([^;]+)/)?.[1];
  assert.ok(sessionId);
  const session = auth.getSession(sessionId);

  assert.throws(
    () => auth.logout(sessionId, "wrong-csrf-token"),
    (error) => error.code === "INVALID_CSRF_TOKEN",
  );
  assert.equal(auth.getSession(sessionId).authorization.role, "client_admin");

  auth.logout(sessionId, session.csrfToken);
  assert.throws(
    () => auth.getSession(sessionId),
    (error) => error.code === "SESSION_REQUIRED",
  );
});

test("kiểm tra đầy đủ các claim bảo mật bắt buộc", () => {
  const baseClaims = createOidcClient().completeAuthorization({});
  return baseClaims.then((claims) => {
    const cases = [
      ["issuer", { iss: "https://attacker.example" }],
      ["audience", { aud: "another-client" }],
      ["expiry", { exp: Math.floor(NOW / 1000) - 1 }],
      ["nonce", { nonce: "wrong-nonce" }],
      ["email_verified", { email_verified: false }],
      ["hosted domain", { hd: "example.com" }],
    ];

    for (const [label, overrides] of cases) {
      assert.throws(
        () =>
          validateGoogleClaims(
            { ...claims, ...overrides },
            {
              issuer: "https://accounts.google.com",
              clientId: "google-client-id.apps.googleusercontent.com",
              expectedNonce: "nonce-001",
              hostedDomain: "qts.com.vn",
              now: NOW,
            },
          ),
        undefined,
        label,
      );
    }
  });
});
