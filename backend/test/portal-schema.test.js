import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseCreateAlert,
  parseCreateIntegration,
  parseCreateTicket,
  parseListQuery,
  parseTicketPatch,
} from "../src/portal-schema.js";

test("phân trang có giới hạn cứng và sort allowlist", () => {
  const query = parseListQuery(
    new URLSearchParams("page=2&pageSize=25&sortBy=createdAt&sortOrder=asc&status=OPEN"),
    { filters: ["status"], sortFields: ["createdAt", "severity"] },
  );

  assert.deepEqual(query, {
    page: 2,
    pageSize: 25,
    search: "",
    sortBy: "createdAt",
    sortOrder: "asc",
    filters: { status: "OPEN" },
  });
  assert.throws(
    () => parseListQuery(new URLSearchParams("pageSize=501"), {}),
    (error) => error.code === "VALIDATION_ERROR",
  );
  assert.throws(
    () => parseListQuery(new URLSearchParams("sortBy=drop_table"), { sortFields: ["createdAt"] }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("ticket được chuẩn hóa và từ chối field ngoài contract", () => {
  assert.deepEqual(
    parseCreateTicket({
      subject: "  Mất kết nối VPN  ",
      description: "  Không thể kết nối từ văn phòng Hà Nội.  ",
      category: "INCIDENT",
      severity: "HIGH",
    }),
    {
      subject: "Mất kết nối VPN",
      description: "Không thể kết nối từ văn phòng Hà Nội.",
      category: "INCIDENT",
      severity: "HIGH",
    },
  );
  assert.throws(
    () => parseCreateTicket({ subject: "Sự cố", description: "Chi tiết", role: "qts_admin" }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("ticket patch bắt buộc version để tránh ghi đè đồng thời", () => {
  assert.deepEqual(parseTicketPatch({ status: "IN_PROGRESS", expectedVersion: 3 }), {
    status: "IN_PROGRESS",
    expectedVersion: 3,
  });
  assert.throws(
    () => parseTicketPatch({ status: "RESOLVED" }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("alert yêu cầu dữ liệu vận hành thật và taxonomy hợp lệ", () => {
  const alert = parseCreateAlert({
    title: "Phát hiện đăng nhập bất thường",
    description: "Nguồn SIEM phát hiện đăng nhập từ vị trí chưa từng xuất hiện.",
    severity: "CRITICAL",
    source: "SIEM",
    detectedAt: "2026-08-03T08:00:00.000Z",
  });
  assert.equal(alert.severity, "CRITICAL");
  assert.throws(
    () => parseCreateAlert({ ...alert, severity: "EXTREME" }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("integration chỉ nhận HTTPS và không trả secret qua contract đầu ra", () => {
  assert.deepEqual(
    parseCreateIntegration({
      tenantId: "tenant-a",
      name: "SIEM sản xuất",
      type: "SIEM",
      endpointUrl: "https://siem.example.com/events",
      secret: "a-strong-integration-secret",
    }),
    {
      tenantId: "tenant-a",
      name: "SIEM sản xuất",
      type: "SIEM",
      endpointUrl: "https://siem.example.com/events",
      secret: "a-strong-integration-secret",
    },
  );
  assert.throws(
    () => parseCreateIntegration({
      tenantId: "tenant-a",
      name: "Webhook nội bộ",
      type: "WEBHOOK",
      endpointUrl: "http://127.0.0.1:8080/admin",
    }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});
