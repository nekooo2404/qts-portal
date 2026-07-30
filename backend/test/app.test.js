import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, test } from "node:test";

import { createRequestHandler } from "../src/app.js";

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

async function request(path, options = {}) {
  const server = createServer(createRequestHandler(options.appOptions));
  servers.add(server);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");

  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: options.method ?? "GET",
  });
}

test("GET /api/v1/health trả về trạng thái sống và security headers", async () => {
  const response = await request("/api/v1/health");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.deepEqual(await response.json(), {
    data: {
      service: "qts-portal-api",
      status: "ok",
      version: "1.0.0",
    },
  });
});

test("GET /api/v1/ready trả về ready khi dependency check thành công", async () => {
  const response = await request("/api/v1/ready");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: {
      status: "ready",
    },
  });
});

test("GET /api/v1/ready trả về 503 khi dependency check thất bại", async () => {
  const response = await request("/api/v1/ready", {
    appOptions: { isReady: () => false },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: {
      code: "SERVICE_UNAVAILABLE",
      message: "Dịch vụ chưa sẵn sàng.",
    },
  });
});

test("route không tồn tại trả về lỗi JSON nhất quán", async () => {
  const response = await request("/api/v1/not-found");

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: "NOT_FOUND",
      message: "Không tìm thấy tài nguyên.",
    },
  });
});

test("method không được hỗ trợ trả về 405 và Allow header", async () => {
  const response = await request("/api/v1/health", { method: "POST" });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.deepEqual(await response.json(), {
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: "Phương thức HTTP không được hỗ trợ.",
    },
  });
});
