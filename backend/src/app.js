import { isIP } from "node:net";

import { createAuthService } from "./auth-service.js";
import { readAuthConfig } from "./auth-config.js";

const SERVICE = Object.freeze({
  name: "qts-portal-api",
  version: "1.0.0",
});

const DEFAULT_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});
const LOGIN_RATE_LIMIT = 30;
const LOGIN_RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_RATE_LIMIT_CLIENTS = 10_000;

function writeJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function writeError(response, statusCode, code, message, headers) {
  writeJson(
    response,
    statusCode,
    {
      error: {
        code,
        message,
      },
    },
    headers,
  );
}

function writeRedirect(response, statusCode, location, cookies = []) {
  response.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    Location: location,
    ...(cookies.length > 0 ? { "Set-Cookie": cookies } : {}),
  });
  response.end();
}

function writeNoContent(response, headers = {}) {
  response.writeHead(204, {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...headers,
  });
  response.end();
}

function parseCookies(cookieHeader) {
  const cookies = new Map();
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies.set(name, decodeURIComponent(rawValue));
    } catch {
      cookies.set(name, "");
    }
  }
  return cookies;
}

function methodAllowed(request, response, expectedMethod) {
  if (request.method === expectedMethod) return true;
  writeError(
    response,
    405,
    "METHOD_NOT_ALLOWED",
    "Phương thức HTTP không được hỗ trợ.",
    { Allow: expectedMethod },
  );
  return false;
}

function handleRequestError(response, error, headers) {
  if (
    error &&
    Number.isInteger(error.statusCode) &&
    typeof error.code === "string" &&
    typeof error.publicMessage === "string"
  ) {
    writeError(response, error.statusCode, error.code, error.publicMessage, headers);
    return;
  }

  process.stderr.write(`${JSON.stringify({ event: "api_request_failed" })}\n`);
  writeError(
    response,
    500,
    "INTERNAL_SERVER_ERROR",
    "Hệ thống không thể xử lý yêu cầu.",
    headers,
  );
}

function createDefaultAuthService() {
  return createAuthService({ config: readAuthConfig({ NODE_ENV: "development" }) });
}

export function createLoginRateLimiter({
  limit = LOGIN_RATE_LIMIT,
  windowMs = LOGIN_RATE_WINDOW_MS,
  maxClients = MAX_RATE_LIMIT_CLIENTS,
  now = Date.now,
} = {}) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(windowMs) ||
    windowMs < 1 ||
    !Number.isInteger(maxClients) ||
    maxClients < 1
  ) {
    throw new Error("Login rate limiter options must be positive integers.");
  }
  const clients = new Map();

  function prune(currentTime) {
    for (const [key, record] of clients) {
      if (record.resetAt <= currentTime) clients.delete(key);
    }
    while (clients.size >= maxClients) {
      clients.delete(clients.keys().next().value);
    }
  }

  return Object.freeze({
    allow(clientKey) {
      const currentTime = now();
      const current = clients.get(clientKey);
      if (!current || current.resetAt <= currentTime) {
        if (!current) prune(currentTime);
        clients.set(clientKey, { count: 1, resetAt: currentTime + windowMs });
        return true;
      }
      if (current.count >= limit) return false;
      current.count += 1;
      return true;
    },
    retryAfterSeconds(clientKey) {
      const current = clients.get(clientKey);
      if (!current) return 0;
      return Math.max(1, Math.ceil((current.resetAt - now()) / 1000));
    },
  });
}

export function resolveClientAddress(request, trustedProxyHops = 0) {
  const directAddress = request.socket.remoteAddress ?? "unknown";
  if (trustedProxyHops === 0) return directAddress;

  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor !== "string") return directAddress;
  const addresses = forwardedFor
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const candidate = addresses.at(-trustedProxyHops);
  return candidate && isIP(candidate) ? candidate : directAddress;
}

export function createRequestHandler({
  isReady = () => true,
  authService = createDefaultAuthService(),
  loginRateLimiter = createLoginRateLimiter(),
  trustedProxyHops = 0,
} = {}) {
  return async function requestHandler(request, response) {
    let requestUrl;

    try {
      requestUrl = new URL(request.url ?? "/", "http://qts-api.local");
    } catch {
      writeError(response, 400, "BAD_REQUEST", "Yêu cầu không hợp lệ.");
      return;
    }

    const { pathname } = requestUrl;

    const isInfrastructureRoute =
      pathname === "/api/v1/health" || pathname === "/api/v1/ready";

    if (isInfrastructureRoute && request.method !== "GET") {
      writeError(
        response,
        405,
        "METHOD_NOT_ALLOWED",
        "Phương thức HTTP không được hỗ trợ.",
        { Allow: "GET" },
      );
      return;
    }

    if (pathname === "/api/v1/health") {
      writeJson(response, 200, {
        data: {
          service: SERVICE.name,
          status: "ok",
          version: SERVICE.version,
        },
      });
      return;
    }

    if (pathname === "/api/v1/ready") {
      let ready = false;

      try {
        ready = await isReady();
      } catch {
        ready = false;
      }

      if (!ready) {
        writeError(
          response,
          503,
          "SERVICE_UNAVAILABLE",
          "Dịch vụ chưa sẵn sàng.",
        );
        return;
      }

      writeJson(response, 200, {
        data: {
          status: "ready",
        },
      });
      return;
    }

    if (pathname === "/api/v1/auth/status") {
      if (!methodAllowed(request, response, "GET")) return;
      writeJson(response, 200, { data: authService.getStatus() });
      return;
    }

    if (pathname === "/api/v1/auth/login/google") {
      if (!methodAllowed(request, response, "GET")) return;
      const clientKey = resolveClientAddress(request, trustedProxyHops);
      if (!loginRateLimiter.allow(clientKey)) {
        writeError(
          response,
          429,
          "AUTH_RATE_LIMITED",
          "Có quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.",
          { "Retry-After": String(loginRateLimiter.retryAfterSeconds(clientKey)) },
        );
        return;
      }
      try {
        const result = await authService.beginGoogleLogin({
          returnTo: requestUrl.searchParams.get("returnTo") ?? "/",
        });
        writeRedirect(response, 302, result.authorizationUrl.href, [
          result.transactionCookie,
        ]);
      } catch (error) {
        handleRequestError(response, error);
      }
      return;
    }

    if (pathname === "/api/v1/auth/callback/google") {
      if (!methodAllowed(request, response, "GET")) return;
      const cookies = parseCookies(request.headers.cookie);
      const clearTransactionCookie = authService.createExpiredTransactionCookie?.();
      const errorHeaders = clearTransactionCookie
        ? { "Set-Cookie": clearTransactionCookie }
        : undefined;

      try {
        const callbackUrl = new URL(authService.callbackUrl ?? requestUrl.href);
        callbackUrl.search = requestUrl.search;
        const result = await authService.completeGoogleLogin({
          callbackUrl,
          transactionCookie: cookies.get(authService.transactionCookieName),
        });
        writeRedirect(response, 303, result.redirectTo, [
          result.transactionCookie,
          result.sessionCookie,
        ]);
      } catch (error) {
        handleRequestError(response, error, errorHeaders);
      }
      return;
    }

    if (pathname === "/api/v1/auth/session") {
      if (!methodAllowed(request, response, "GET")) return;
      try {
        const cookies = parseCookies(request.headers.cookie);
        const session = await authService.getSession(
          cookies.get(authService.sessionCookieName),
        );
        writeJson(response, 200, { data: session });
      } catch (error) {
        const headers =
          error?.code === "SESSION_REQUIRED"
            ? { "Set-Cookie": authService.createExpiredSessionCookie() }
            : undefined;
        handleRequestError(response, error, headers);
      }
      return;
    }

    if (pathname === "/api/v1/auth/logout") {
      if (!methodAllowed(request, response, "POST")) return;
      try {
        const cookies = parseCookies(request.headers.cookie);
        await authService.logout(
          cookies.get(authService.sessionCookieName),
          request.headers["x-csrf-token"],
        );
        writeNoContent(response, {
          "Set-Cookie": authService.createExpiredSessionCookie(),
        });
      } catch (error) {
        const headers =
          error?.code === "SESSION_REQUIRED"
            ? { "Set-Cookie": authService.createExpiredSessionCookie() }
            : undefined;
        handleRequestError(response, error, headers);
      }
      return;
    }

    writeError(response, 404, "NOT_FOUND", "Không tìm thấy tài nguyên.");
  };
}
