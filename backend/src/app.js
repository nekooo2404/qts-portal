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

export function createRequestHandler({ isReady = () => true } = {}) {
  return async function requestHandler(request, response) {
    let pathname;

    try {
      pathname = new URL(request.url ?? "/", "http://qts-api.local").pathname;
    } catch {
      writeError(response, 400, "BAD_REQUEST", "Yêu cầu không hợp lệ.");
      return;
    }

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

    writeError(response, 404, "NOT_FOUND", "Không tìm thấy tài nguyên.");
  };
}
