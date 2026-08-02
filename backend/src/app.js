import { randomUUID } from "node:crypto";
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
const DEFAULT_JSON_BODY_LIMIT = 1024 * 1024;
const DOCUMENT_JSON_BODY_LIMIT = 14 * 1024 * 1024;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,64}$/;
const PORTAL_RESOURCES = new Set([
  "alerts",
  "tickets",
  "assets",
  "licenses",
  "tenants",
  "contracts",
  "invoices",
  "documents",
  "knowledge",
  "integrations",
  "shifts",
]);

function writeJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function writeError(response, statusCode, code, message, headers, details) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  writeJson(
    response,
    statusCode,
    {
      error,
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
    writeError(
      response,
      error.statusCode,
      error.code,
      error.publicMessage,
      headers,
      error.details,
    );
    return;
  }

  if (error?.code === "23505") {
    writeError(
      response,
      409,
      "RESOURCE_CONFLICT",
      "Du lieu da ton tai hoac xung dot voi mot ban ghi khac.",
      headers,
    );
    return;
  }

  if (new Set(["23503", "23514", "22007", "22P02"]).has(error?.code)) {
    writeError(
      response,
      422,
      "VALIDATION_ERROR",
      "Du lieu gui len khong hop le.",
      headers,
    );
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

function requestIdFor(request) {
  const candidate = request.headers["x-request-id"];
  return typeof candidate === "string" && REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
}

function headerValue(request, name) {
  const value = request.headers[name];
  return typeof value === "string" ? value : undefined;
}

async function readJsonBody(request, { limit = DEFAULT_JSON_BODY_LIMIT } = {}) {
  const contentType = headerValue(request, "content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    const error = new Error("JSON content type required.");
    Object.assign(error, {
      statusCode: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      publicMessage: "Content-Type phai la application/json.",
    });
    throw error;
  }

  const declaredLength = Number(headerValue(request, "content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    const error = new Error("Request body too large.");
    Object.assign(error, {
      statusCode: 413,
      code: "PAYLOAD_TOO_LARGE",
      publicMessage: "Du lieu gui len vuot qua gioi han cho phep.",
    });
    throw error;
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) {
      const error = new Error("Request body too large.");
      Object.assign(error, {
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
        publicMessage: "Du lieu gui len vuot qua gioi han cho phep.",
      });
      throw error;
    }
    chunks.push(chunk);
  }

  if (length === 0) {
    const error = new Error("Request body required.");
    Object.assign(error, {
      statusCode: 400,
      code: "INVALID_JSON",
      publicMessage: "Body JSON la bat buoc.",
    });
    throw error;
  }

  try {
    return JSON.parse(Buffer.concat(chunks, length).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON.");
    Object.assign(error, {
      statusCode: 400,
      code: "INVALID_JSON",
      publicMessage: "Body JSON khong hop le.",
    });
    throw error;
  }
}

function safeDownloadName(value) {
  const fallback = "qts-document.pdf";
  if (typeof value !== "string" || value.trim() === "") return fallback;
  return value
    .trim()
    .replace(/["\\\r\n]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .slice(0, 180) || fallback;
}

function writeDownload(response, document, headers = {}) {
  const content = Buffer.isBuffer(document.content)
    ? document.content
    : Buffer.from(document.content);
  const filename = safeDownloadName(document.filename);
  response.writeHead(200, {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(content.length),
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Content-Type": document.mediaType,
    Digest: `sha-256=${document.contentSha256}`,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...headers,
  });
  response.end(content);
}

function requireMethod(request, allowedMethods) {
  if (allowedMethods.includes(request.method)) return;
  const error = new Error("Method not allowed.");
  Object.assign(error, {
    statusCode: 405,
    code: "METHOD_NOT_ALLOWED",
    publicMessage: "Phuong thuc HTTP khong duoc ho tro.",
    responseHeaders: { Allow: allowedMethods.join(", ") },
  });
  throw error;
}

async function handlePortalRequest({
  authService,
  portalService,
  request,
  requestUrl,
  response,
  trustedProxyHops,
}) {
  const requestId = requestIdFor(request);
  const responseHeaders = { "X-Request-Id": requestId };

  try {
    if (!portalService) {
      const error = new Error("Portal service unavailable.");
      Object.assign(error, {
        statusCode: 503,
        code: "PORTAL_UNAVAILABLE",
        publicMessage: "Dich vu portal chua san sang.",
      });
      throw error;
    }

    const cookies = parseCookies(request.headers.cookie);
    const isMutation = request.method !== "GET" && request.method !== "HEAD";
    const actor = await authService.authenticateSession(
      cookies.get(authService.sessionCookieName),
      isMutation ? headerValue(request, "x-csrf-token") : undefined,
    );
    const context = {
      requestId,
      ipAddress: resolveClientAddress(request, trustedProxyHops),
    };
    const segments = requestUrl.pathname
      .slice("/api/v1/portal/".length)
      .split("/")
      .filter(Boolean);

    if (segments.length === 1 && segments[0] === "overview") {
      requireMethod(request, ["GET"]);
      const result = await portalService.getOverview({
        actor,
        requestedTenantId: requestUrl.searchParams.get("tenantId") || undefined,
      });
      writeJson(response, 200, { data: result }, responseHeaders);
      return;
    }

    if (segments.length === 1 && PORTAL_RESOURCES.has(segments[0])) {
      const resource = segments[0];
      requireMethod(request, ["GET", "POST"]);
      if (request.method === "GET") {
        const result = await portalService.listResources({
          actor,
          resource,
          searchParams: requestUrl.searchParams,
        });
        writeJson(response, 200, result, responseHeaders);
        return;
      }
      const input = await readJsonBody(request, {
        limit: resource === "documents"
          ? DOCUMENT_JSON_BODY_LIMIT
          : DEFAULT_JSON_BODY_LIMIT,
      });
      const result = await portalService.createResource({
        actor,
        context,
        idempotencyKey: headerValue(request, "idempotency-key"),
        input,
        resource,
      });
      writeJson(response, 201, { data: result }, responseHeaders);
      return;
    }

    if (
      segments.length === 2 &&
      PORTAL_RESOURCES.has(segments[0]) &&
      segments[0] !== "documents"
    ) {
      requireMethod(request, ["PATCH"]);
      const input = await readJsonBody(request);
      const result = await portalService.updateResource({
        actor,
        context,
        id: segments[1],
        input,
        resource: segments[0],
      });
      writeJson(response, 200, { data: result }, responseHeaders);
      return;
    }

    if (segments.length === 3 && segments[0] === "tickets" && segments[2] === "comments") {
      requireMethod(request, ["GET", "POST"]);
      if (request.method === "GET") {
        const result = await portalService.listTicketComments({
          actor,
          id: segments[1],
        });
        writeJson(response, 200, { data: result }, responseHeaders);
        return;
      }
      const input = await readJsonBody(request);
      const result = await portalService.createTicketComment({
        actor,
        context,
        id: segments[1],
        input,
      });
      writeJson(response, 201, { data: result }, responseHeaders);
      return;
    }

    if (segments.length === 3 && segments[0] === "documents" && segments[2] === "download") {
      requireMethod(request, ["GET"]);
      const result = await portalService.getDocument({
        actor,
        context,
        id: segments[1],
      });
      writeDownload(response, result, responseHeaders);
      return;
    }

    if (segments.length === 1 && segments[0] === "members") {
      requireMethod(request, ["GET"]);
      const result = await portalService.listMembers({
        actor,
        searchParams: requestUrl.searchParams,
      });
      writeJson(response, 200, result, responseHeaders);
      return;
    }

    if (segments.length === 2 && segments[0] === "members") {
      requireMethod(request, ["PATCH"]);
      const input = await readJsonBody(request);
      const result = await portalService.updateMember({
        actor,
        context,
        id: segments[1],
        input,
      });
      writeJson(response, 200, { data: result }, responseHeaders);
      return;
    }

    if (segments.length === 1 && segments[0] === "invitations") {
      requireMethod(request, ["GET", "POST"]);
      if (request.method === "GET") {
        const result = await portalService.listInvitations({
          actor,
          searchParams: requestUrl.searchParams,
        });
        writeJson(response, 200, result, responseHeaders);
        return;
      }
      const input = await readJsonBody(request);
      const result = await portalService.createInvitation({ actor, context, input });
      writeJson(response, 201, { data: result }, responseHeaders);
      return;
    }

    if (segments.length === 1 && segments[0] === "audit") {
      requireMethod(request, ["GET"]);
      const result = await portalService.listAudit({
        actor,
        searchParams: requestUrl.searchParams,
      });
      writeJson(response, 200, result, responseHeaders);
      return;
    }

    writeError(
      response,
      404,
      "NOT_FOUND",
      "Khong tim thay tai nguyen.",
      responseHeaders,
    );
  } catch (error) {
    const headers = {
      ...responseHeaders,
      ...(error?.responseHeaders ?? {}),
      ...(error?.code === "SESSION_REQUIRED" && authService.createExpiredSessionCookie
        ? { "Set-Cookie": authService.createExpiredSessionCookie() }
        : {}),
    };
    handleRequestError(response, error, headers);
  }
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
  portalService,
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

    if (pathname.startsWith("/api/v1/portal/")) {
      await handlePortalRequest({
        authService,
        portalService,
        request,
        requestUrl,
        response,
        trustedProxyHops,
      });
      return;
    }

    writeError(response, 404, "NOT_FOUND", "Không tìm thấy tài nguyên.");
  };
}
