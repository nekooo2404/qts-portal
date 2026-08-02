import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createMemoryExpiringStore } from "./auth-store.js";

const CALLBACK_PATH = "/api/v1/auth/callback/google";
const MAX_RETURN_TO_LENGTH = 2048;

export class AuthServiceError extends Error {
  constructor(statusCode, code, publicMessage) {
    super(publicMessage);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

function fail(statusCode, code, message) {
  throw new AuthServiceError(statusCode, code, message);
}

function secureEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function hasAudience(audience, clientId) {
  if (typeof audience === "string") return secureEqual(audience, clientId);
  return Array.isArray(audience) && audience.some((item) => secureEqual(item, clientId));
}

export function validateGoogleClaims(
  claims,
  { issuer, clientId, expectedNonce, hostedDomain, now = Date.now() },
) {
  if (!claims || typeof claims !== "object") {
    fail(401, "INVALID_ID_TOKEN", "ID token của Google không hợp lệ.");
  }
  if (!secureEqual(claims.iss, issuer)) {
    fail(401, "INVALID_ID_TOKEN_ISSUER", "Issuer của ID token không hợp lệ.");
  }
  if (!hasAudience(claims.aud, clientId)) {
    fail(401, "INVALID_ID_TOKEN_AUDIENCE", "Audience của ID token không hợp lệ.");
  }
  if (!Number.isFinite(claims.exp) || claims.exp <= Math.floor(now / 1000)) {
    fail(401, "EXPIRED_ID_TOKEN", "ID token của Google đã hết hạn.");
  }
  if (!secureEqual(claims.nonce, expectedNonce)) {
    fail(401, "INVALID_ID_TOKEN_NONCE", "Nonce của ID token không hợp lệ.");
  }
  if (claims.email_verified !== true) {
    fail(403, "EMAIL_NOT_VERIFIED", "Tài khoản Google chưa xác minh email.");
  }
  if (hostedDomain) {
    const receivedDomain = typeof claims.hd === "string" ? claims.hd.toLowerCase() : "";
    if (!secureEqual(receivedDomain, hostedDomain.toLowerCase())) {
      fail(403, "HOSTED_DOMAIN_NOT_ALLOWED", "Tài khoản không thuộc Google Workspace được phép.");
    }
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    fail(401, "INVALID_ID_TOKEN_SUBJECT", "Subject của ID token không hợp lệ.");
  }
  if (typeof claims.email !== "string" || claims.email.trim() === "") {
    fail(401, "INVALID_ID_TOKEN_EMAIL", "ID token không chứa email hợp lệ.");
  }

  return claims;
}

function normalizeReturnTo(value, publicOrigin) {
  const candidate = value || "/";
  if (candidate.length > MAX_RETURN_TO_LENGTH || !candidate.startsWith("/")) {
    fail(400, "INVALID_RETURN_PATH", "Đường dẫn sau đăng nhập không hợp lệ.");
  }

  let url;
  try {
    url = new URL(candidate, publicOrigin);
  } catch {
    fail(400, "INVALID_RETURN_PATH", "Đường dẫn sau đăng nhập không hợp lệ.");
  }
  if (url.origin !== publicOrigin || candidate.startsWith("//")) {
    fail(400, "INVALID_RETURN_PATH", "Đường dẫn sau đăng nhập không hợp lệ.");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function authorizedReturnTo(returnTo, workspace) {
  const prefix = workspace === "client" ? "/client" : "/admin";
  if (returnTo === prefix || returnTo.startsWith(`${prefix}/`)) return returnTo;
  return workspace === "client" ? "/client/overview" : "/admin/soc";
}

function randomIdentifier() {
  return randomBytes(32).toString("base64url");
}

function serializeCookie(name, value, { maxAgeSeconds, path, secure }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
    "Priority=High",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function publicSession(record) {
  return {
    user: { ...record.user },
    authorization: { ...record.authorization },
    csrfToken: record.csrfToken,
    expiresAt: new Date(record.expiresAt).toISOString(),
  };
}

export function createAuthService({
  config,
  oidcClient,
  now = Date.now,
  audit = () => {},
  membershipResolver,
  transactionStore = createMemoryExpiringStore({ now }),
  sessionStore = createMemoryExpiringStore({ now }),
} = {}) {
  if (!config) throw new Error("Authentication config is required.");

  const transactionCookieName =
    config.transactionCookieName ??
    (config.cookieSecure ? "__Secure-qts_oidc_tx" : "qts_oidc_tx");
  const sessionCookieName =
    config.sessionCookieName ??
    (config.cookieSecure ? "__Host-qts_session" : "qts_session");
  const membershipByIdentity = new Map(
    (config.memberships ?? []).map((membership) => [
      `${membership.issuer}\u0000${membership.subject}`,
      membership,
    ]),
  );

  function requireConfigured() {
    if (!config.enabled || !oidcClient) {
      fail(503, "AUTH_NOT_CONFIGURED", "Google OIDC chưa được cấu hình.");
    }
  }

  function createExpiredCookie(name, path) {
    return serializeCookie(name, "", {
      maxAgeSeconds: 0,
      path,
      secure: config.cookieSecure,
    });
  }

  async function emitAudit(event) {
    try {
      await audit(Object.freeze(event));
    } catch {
      // Authentication must not depend on the availability of a log transport.
    }
  }

  return Object.freeze({
    configured: config.enabled,
    provider: "google",
    callbackUrl: config.redirectUri,
    transactionCookieName,
    sessionCookieName,

    getStatus() {
      return { configured: config.enabled, provider: "google" };
    },

    async beginGoogleLogin({ returnTo } = {}) {
      requireConfigured();
      const safeReturnTo = normalizeReturnTo(returnTo, config.publicOrigin);
      const transaction = await oidcClient.createAuthorizationRequest({
        redirectUri: config.redirectUri,
      });
      const expiresAt = now() + config.transactionTtlMs;
      await transactionStore.set(
        transaction.state,
        {
          nonce: transaction.nonce,
          codeVerifier: transaction.codeVerifier,
          returnTo: safeReturnTo,
        },
        expiresAt,
      );

      return {
        authorizationUrl: transaction.url,
        transactionCookie: serializeCookie(transactionCookieName, transaction.state, {
          maxAgeSeconds: Math.floor(config.transactionTtlMs / 1000),
          path: CALLBACK_PATH,
          secure: config.cookieSecure,
        }),
      };
    },

    async completeGoogleLogin({ callbackUrl, transactionCookie }) {
      requireConfigured();
      const returnedState = callbackUrl.searchParams.get("state");
      const code = callbackUrl.searchParams.get("code");
      if (!returnedState || !code || !secureEqual(returnedState, transactionCookie)) {
        fail(400, "INVALID_AUTH_TRANSACTION", "Giao dịch đăng nhập không hợp lệ hoặc đã hết hạn.");
      }

      const transaction = await transactionStore.take(returnedState);
      if (!transaction) {
        fail(400, "INVALID_AUTH_TRANSACTION", "Giao dịch đăng nhập không hợp lệ hoặc đã hết hạn.");
      }

      let claims;
      try {
        claims = await oidcClient.completeAuthorization({
          callbackUrl,
          codeVerifier: transaction.codeVerifier,
          expectedState: returnedState,
          expectedNonce: transaction.nonce,
        });
      } catch {
        fail(401, "OIDC_RESPONSE_INVALID", "Phản hồi xác thực từ Google không hợp lệ.");
      }

      validateGoogleClaims(claims, {
        issuer: config.issuer,
        clientId: config.clientId,
        expectedNonce: transaction.nonce,
        hostedDomain: config.hostedDomain,
        now: now(),
      });

      const configuredMembership = membershipByIdentity.get(`${claims.iss}\u0000${claims.sub}`);
      const membership = membershipResolver
        ? await membershipResolver({ claims, configuredMembership })
        : configuredMembership;
      if (!membership) {
        await emitAudit({
          event: "auth_membership_not_found",
          issuer: claims.iss,
          subject: claims.sub,
          email: claims.email.trim(),
        });
        fail(403, "MEMBERSHIP_NOT_FOUND", "Tài khoản chưa được cấp tenant và role trên QTS Portal.");
      }

      const sessionId = randomIdentifier();
      const csrfToken = randomIdentifier();
      const expiresAt = now() + config.sessionTtlMs;
      await sessionStore.set(
        sessionId,
        {
          identity: { issuer: claims.iss, subject: claims.sub },
          user: {
            email: claims.email.trim(),
            displayName:
              typeof claims.name === "string" && claims.name.trim()
                ? claims.name.trim()
                : claims.email.trim(),
          },
          authorization: {
            tenantId: membership.tenantId,
            role: membership.role,
            workspace: membership.workspace,
          },
          csrfToken,
          expiresAt,
        },
        expiresAt,
      );
      await emitAudit({
        event: "auth_login_succeeded",
        issuer: claims.iss,
        subject: claims.sub,
        tenantId: membership.tenantId,
        role: membership.role,
      });

      return {
        redirectTo: authorizedReturnTo(transaction.returnTo, membership.workspace),
        transactionCookie: createExpiredCookie(transactionCookieName, CALLBACK_PATH),
        sessionCookie: serializeCookie(sessionCookieName, sessionId, {
          maxAgeSeconds: Math.floor(config.sessionTtlMs / 1000),
          path: "/",
          secure: config.cookieSecure,
        }),
      };
    },

    async getSession(sessionId) {
      if (!sessionId) fail(401, "SESSION_REQUIRED", "Cần đăng nhập để tiếp tục.");
      const record = await sessionStore.get(sessionId);
      if (!record) fail(401, "SESSION_REQUIRED", "Phiên đăng nhập không tồn tại hoặc đã hết hạn.");
      return publicSession(record);
    },

    async authenticateSession(sessionId, csrfToken) {
      if (!sessionId) fail(401, "SESSION_REQUIRED", "Cần đăng nhập để tiếp tục.");
      const record = await sessionStore.get(sessionId);
      if (!record) fail(401, "SESSION_REQUIRED", "Phiên đăng nhập không tồn tại hoặc đã hết hạn.");
      if (csrfToken !== undefined && !secureEqual(record.csrfToken, csrfToken)) {
        fail(403, "INVALID_CSRF_TOKEN", "CSRF token không hợp lệ.");
      }
      return {
        identity: { ...record.identity },
        user: { ...record.user },
        authorization: { ...record.authorization },
        csrfToken: record.csrfToken,
        expiresAt: record.expiresAt,
      };
    },

    async logout(sessionId, csrfToken) {
      if (!sessionId) fail(401, "SESSION_REQUIRED", "Cần đăng nhập để tiếp tục.");
      const record = await sessionStore.get(sessionId);
      if (!record) fail(401, "SESSION_REQUIRED", "Phiên đăng nhập không tồn tại hoặc đã hết hạn.");
      if (!secureEqual(record.csrfToken, csrfToken)) {
        fail(403, "INVALID_CSRF_TOKEN", "CSRF token không hợp lệ.");
      }
      await sessionStore.delete(sessionId);
      await emitAudit({
        event: "auth_logout_succeeded",
        issuer: record.identity.issuer,
        subject: record.identity.subject,
        tenantId: record.authorization.tenantId,
        role: record.authorization.role,
      });
    },

    createExpiredTransactionCookie() {
      return createExpiredCookie(transactionCookieName, CALLBACK_PATH);
    },

    createExpiredSessionCookie() {
      return createExpiredCookie(sessionCookieName, "/");
    },
  });
}
