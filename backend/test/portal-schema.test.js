import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseCreateAsset,
  parseCreateAlert,
  parseCreateContract,
  parseCreateDocument,
  parseCreateIntegration,
  parseCreateInvoice,
  parseCreateKnowledgeArticle,
  parseCreateLicense,
  parseCreateShift,
  parseCreateTenant,
  parseCreateTicket,
  parseInvitation,
  parseListQuery,
  parseTicketComment,
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

test("tenant nhận SLA explicit và chuẩn hóa thông tin liên hệ", () => {
  assert.deepEqual(parseCreateTenant({
    id: "acme-vn",
    name: "  ACME Việt Nam ",
    serviceTier: "MSSP Enterprise",
    emergencyContactEmail: "soc@acme.vn",
    slaCriticalMinutes: 30,
  }), {
    id: "acme-vn",
    name: "ACME Việt Nam",
    serviceTier: "MSSP Enterprise",
    emergencyContactEmail: "soc@acme.vn",
    slaCriticalMinutes: 30,
  });
});

test("asset và license giữ invariant số lượng", () => {
  assert.equal(parseCreateAsset({
    tenantId: "acme-vn",
    name: "Firewall biên",
    type: "SECURITY_DEVICE",
    criticality: "CRITICAL",
  }).healthStatus, "UNKNOWN");

  assert.throws(
    () => parseCreateLicense({
      tenantId: "acme-vn",
      productName: "EDR",
      quantity: 10,
      usedQuantity: 11,
    }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("billing contract kiểm tra tiền tệ, số tiền và ngày", () => {
  assert.equal(parseCreateContract({
    tenantId: "acme-vn",
    contractNumber: "QTS-2026-001",
    title: "Dịch vụ SOC",
    status: "ACTIVE",
    startsAt: "2026-08-01",
    currency: "VND",
    totalAmount: 120000000,
  }).currency, "VND");
  assert.throws(
    () => parseCreateInvoice({
      tenantId: "acme-vn",
      invoiceNumber: "INV-001",
      amount: -1,
      currency: "VND",
      status: "ISSUED",
    }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("document chỉ nhận định dạng cho phép và kiểm tra magic bytes PDF", () => {
  const pdf = Buffer.from("%PDF-1.7\nportal report", "utf8").toString("base64");
  const parsed = parseCreateDocument({
    tenantId: "acme-vn",
    type: "SECURITY_REPORT",
    title: "Báo cáo tháng 8",
    filename: "bao-cao-thang-8.pdf",
    mediaType: "application/pdf",
    contentBase64: pdf,
  });
  assert.equal(parsed.content.length > 0, true);
  assert.equal("contentBase64" in parsed, false);

  assert.throws(
    () => parseCreateDocument({
      tenantId: "acme-vn",
      type: "SECURITY_REPORT",
      title: "Tệp giả",
      filename: "fake.pdf",
      mediaType: "application/pdf",
      contentBase64: Buffer.from("not a pdf").toString("base64"),
    }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("knowledge, invitation, shift và comment được validate ở biên", () => {
  assert.equal(parseCreateKnowledgeArticle({
    title: "Ứng phó phishing",
    summary: "Quy trình xác minh và báo cáo email nghi ngờ.",
    body: "Không mở tệp đính kèm. Chuyển tiếp email cho đội SOC để phân tích.",
    category: "Incident response",
    audience: "CLIENT",
    status: "PUBLISHED",
  }).status, "PUBLISHED");

  assert.equal(parseInvitation({
    tenantId: "acme-vn",
    email: "security@acme.vn",
    role: "technical",
    expiresAt: "2026-08-10T08:00:00.000Z",
  }).email, "security@acme.vn");
  assert.equal(parseInvitation({
    tenantId: "qts-vn",
    email: "soc@qts.com.vn",
    role: "qts_admin",
    expiresAt: "2026-08-10T08:00:00.000Z",
  }).role, "qts_admin");

  assert.throws(
    () => parseCreateShift({
      tenantId: "qts-vn",
      engineerName: "SOC L1",
      level: "L1",
      startsAt: "2026-08-03T10:00:00.000Z",
      endsAt: "2026-08-03T09:00:00.000Z",
    }),
    (error) => error.code === "VALIDATION_ERROR",
  );
  assert.deepEqual(parseTicketComment({ body: "Đã gửi log bổ sung theo yêu cầu." }), {
    body: "Đã gửi log bổ sung theo yêu cầu.",
    visibility: "CUSTOMER",
  });
});
