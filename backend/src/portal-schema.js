import { createHash } from "node:crypto";

import { portalFail } from "./portal-errors.js";

const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const STANDARD_QUERY_KEYS = new Set([
  "page",
  "pageSize",
  "search",
  "sortBy",
  "sortOrder",
  "tenantId",
]);

function validationFail(message, details) {
  portalFail(422, "VALIDATION_ERROR", message, details);
}

function record(value, label = "Dữ liệu") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    validationFail(`${label} phải là một JSON object.`);
  }
  return value;
}

function assertKnownKeys(value, allowedKeys) {
  const unknown = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (unknown.length > 0) {
    validationFail("Yêu cầu chứa trường không được hỗ trợ.", { fields: unknown });
  }
}

function text(value, name, { min = 1, max = 255, optional = false } = {}) {
  if ((value === undefined || value === null) && optional) return undefined;
  if (typeof value !== "string") validationFail(`${name} phải là chuỗi.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    validationFail(`${name} phải có từ ${min} đến ${max} ký tự.`);
  }
  return normalized;
}

function oneOf(value, name, values, { optional = false } = {}) {
  if ((value === undefined || value === null) && optional) return undefined;
  if (typeof value !== "string" || !values.includes(value)) {
    validationFail(`${name} không hợp lệ.`, { allowedValues: values });
  }
  return value;
}

function positiveInteger(value, name, { maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = typeof value === "string" && value !== "" ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    validationFail(`${name} phải là số nguyên từ 1 đến ${maximum}.`);
  }
  return parsed;
}

function nonNegativeInteger(value, name, { maximum = Number.MAX_SAFE_INTEGER, optional = false } = {}) {
  if ((value === undefined || value === null) && optional) return undefined;
  const parsed = typeof value === "string" && value !== "" ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > maximum) {
    validationFail(`${name} phải là số nguyên từ 0 đến ${maximum}.`);
  }
  return parsed;
}

function nonNegativeNumber(value, name, { optional = false } = {}) {
  if ((value === undefined || value === null || value === "") && optional) return undefined;
  const parsed = typeof value === "string" && value !== "" ? Number(value) : value;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000_000_000) {
    validationFail(`${name} phải là số không âm hợp lệ.`);
  }
  return parsed;
}

function isoDateTime(value, name, { optional = false } = {}) {
  if ((value === undefined || value === null || value === "") && optional) return undefined;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    validationFail(`${name} phải là thời gian ISO 8601 hợp lệ.`);
  }
  return new Date(value).toISOString();
}

function dateOnly(value, name, { optional = false } = {}) {
  if ((value === undefined || value === null || value === "") && optional) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    validationFail(`${name} phải có định dạng YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    validationFail(`${name} không phải ngày hợp lệ.`);
  }
  return value;
}

function email(value, name = "Email", { optional = false } = {}) {
  if ((value === undefined || value === null || value === "") && optional) return undefined;
  const normalized = text(value, name, { max: 320 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    validationFail(`${name} không hợp lệ.`);
  }
  return normalized;
}

function tenantId(value, { optional = false } = {}) {
  if ((value === undefined || value === null) && optional) return undefined;
  const normalized = text(value, "tenantId", { max: 64 });
  if (!TENANT_ID_PATTERN.test(normalized)) validationFail("tenantId không hợp lệ.");
  return normalized;
}

export function parseListQuery(searchParams, { filters = [], sortFields = [] } = {}) {
  const allowedKeys = new Set([...STANDARD_QUERY_KEYS, ...filters]);
  const unknown = [...searchParams.keys()].filter((key) => !allowedKeys.has(key));
  if (unknown.length > 0) {
    validationFail("Query chứa tham số không được hỗ trợ.", { fields: [...new Set(unknown)] });
  }

  const page = positiveInteger(searchParams.get("page") ?? 1, "page", { maximum: 1_000_000 });
  const pageSize = positiveInteger(searchParams.get("pageSize") ?? 20, "pageSize", { maximum: 100 });
  const search = (searchParams.get("search") ?? "").trim();
  if (search.length > 200) validationFail("search không được vượt quá 200 ký tự.");
  const requestedSort = searchParams.get("sortBy");
  const sortBy = requestedSort || sortFields[0] || "createdAt";
  if (!sortFields.includes(sortBy) && sortFields.length > 0) {
    validationFail("sortBy không hợp lệ.", { allowedValues: sortFields });
  }
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  if (!new Set(["asc", "desc"]).has(sortOrder)) validationFail("sortOrder không hợp lệ.");

  const parsedFilters = {};
  for (const key of filters) {
    const value = searchParams.get(key);
    if (value !== null && value !== "") parsedFilters[key] = value;
  }

  return { page, pageSize, search, sortBy, sortOrder, filters: parsedFilters };
}

export function parseCreateTicket(input) {
  const value = record(input);
  assertKnownKeys(value, ["tenantId", "subject", "description", "category", "severity"]);
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    subject: text(value.subject, "Tiêu đề", { min: 3, max: 180 }),
    description: text(value.description, "Mô tả", { min: 5, max: 10_000 }),
    category: oneOf(
      value.category ?? "SERVICE_REQUEST",
      "Loại ticket",
      ["INCIDENT", "SERVICE_REQUEST", "CHANGE_REQUEST", "BILLING"],
    ),
    severity: oneOf(value.severity ?? "MEDIUM", "Mức độ", ["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  });
}

export function parseTicketPatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["status", "severity", "assignee", "expectedVersion"]);
  const parsed = removeUndefined({
    status: oneOf(value.status, "Trạng thái", ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"], { optional: true }),
    severity: oneOf(value.severity, "Mức độ", ["CRITICAL", "HIGH", "MEDIUM", "LOW"], { optional: true }),
    assignee: text(value.assignee, "Người xử lý", { max: 255, optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật ticket.");
  return parsed;
}

export function parseCreateAlert(input) {
  const value = record(input);
  assertKnownKeys(value, ["tenantId", "externalRef", "title", "description", "severity", "source", "assetId", "detectedAt"]);
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    externalRef: text(value.externalRef, "Mã cảnh báo nguồn", { max: 160, optional: true }),
    title: text(value.title, "Tiêu đề", { min: 3, max: 180 }),
    description: text(value.description, "Mô tả", { min: 5, max: 10_000 }),
    severity: oneOf(value.severity, "Mức độ", ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
    source: text(value.source, "Nguồn", { max: 100 }),
    assetId: text(value.assetId, "Tài sản", { max: 64, optional: true }),
    detectedAt: isoDateTime(value.detectedAt, "Thời điểm phát hiện"),
  });
}

export function parseCreateIntegration(input) {
  const value = record(input);
  assertKnownKeys(value, ["tenantId", "name", "type", "endpointUrl", "secret"]);
  const endpointUrl = text(value.endpointUrl, "Endpoint URL", { max: 2048 });
  let parsedUrl;
  try {
    parsedUrl = new URL(endpointUrl);
  } catch {
    validationFail("Endpoint URL không hợp lệ.");
  }
  if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
    validationFail("Endpoint tích hợp phải dùng HTTPS và không chứa credential trong URL.");
  }

  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    name: text(value.name, "Tên tích hợp", { min: 3, max: 160 }),
    type: oneOf(value.type, "Loại tích hợp", ["SIEM", "SOAR", "EDR", "WEBHOOK", "OTHER"]),
    endpointUrl: parsedUrl.href,
    secret: text(value.secret, "Secret", { min: 16, max: 4096, optional: true }),
  });
}

export function parseCreateTenant(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "id", "name", "status", "serviceTier", "emergencyContactName",
    "emergencyContactEmail", "emergencyContactPhone", "notes",
    "slaCriticalMinutes", "slaHighMinutes", "slaMediumMinutes", "slaLowMinutes",
  ]);
  return removeUndefined({
    id: tenantId(value.id),
    name: text(value.name, "Tên tenant", { min: 2, max: 180 }),
    status: oneOf(value.status, "Trạng thái", ["ACTIVE", "SUSPENDED", "ARCHIVED"], { optional: true }),
    serviceTier: text(value.serviceTier, "Gói dịch vụ", { max: 80, optional: true }),
    emergencyContactName: text(value.emergencyContactName, "Người liên hệ khẩn cấp", { max: 160, optional: true }),
    emergencyContactEmail: email(value.emergencyContactEmail, "Email khẩn cấp", { optional: true }),
    emergencyContactPhone: text(value.emergencyContactPhone, "Số điện thoại khẩn cấp", { max: 40, optional: true }),
    notes: text(value.notes, "Ghi chú", { max: 5000, optional: true }),
    slaCriticalMinutes: value.slaCriticalMinutes === undefined ? undefined : positiveInteger(value.slaCriticalMinutes, "SLA Critical", { maximum: 525_600 }),
    slaHighMinutes: value.slaHighMinutes === undefined ? undefined : positiveInteger(value.slaHighMinutes, "SLA High", { maximum: 525_600 }),
    slaMediumMinutes: value.slaMediumMinutes === undefined ? undefined : positiveInteger(value.slaMediumMinutes, "SLA Medium", { maximum: 525_600 }),
    slaLowMinutes: value.slaLowMinutes === undefined ? undefined : positiveInteger(value.slaLowMinutes, "SLA Low", { maximum: 525_600 }),
  });
}

export function parseTenantPatch(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "name", "status", "serviceTier", "emergencyContactName",
    "emergencyContactEmail", "emergencyContactPhone", "notes",
    "slaCriticalMinutes", "slaHighMinutes", "slaMediumMinutes", "slaLowMinutes",
    "expectedVersion",
  ]);
  const parsed = removeUndefined({
    name: text(value.name, "Tên tenant", { min: 2, max: 180, optional: true }),
    status: oneOf(value.status, "Trạng thái", ["ACTIVE", "SUSPENDED", "ARCHIVED"], { optional: true }),
    serviceTier: text(value.serviceTier, "Gói dịch vụ", { max: 80, optional: true }),
    emergencyContactName: text(value.emergencyContactName, "Người liên hệ", { max: 160, optional: true }),
    emergencyContactEmail: email(value.emergencyContactEmail, "Email khẩn cấp", { optional: true }),
    emergencyContactPhone: text(value.emergencyContactPhone, "Số điện thoại", { max: 40, optional: true }),
    notes: text(value.notes, "Ghi chú", { max: 5000, optional: true }),
    slaCriticalMinutes: value.slaCriticalMinutes === undefined ? undefined : positiveInteger(value.slaCriticalMinutes, "SLA Critical", { maximum: 525_600 }),
    slaHighMinutes: value.slaHighMinutes === undefined ? undefined : positiveInteger(value.slaHighMinutes, "SLA High", { maximum: 525_600 }),
    slaMediumMinutes: value.slaMediumMinutes === undefined ? undefined : positiveInteger(value.slaMediumMinutes, "SLA Medium", { maximum: 525_600 }),
    slaLowMinutes: value.slaLowMinutes === undefined ? undefined : positiveInteger(value.slaLowMinutes, "SLA Low", { maximum: 525_600 }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật tenant.");
  return parsed;
}

export function parseCreateAsset(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "tenantId", "name", "type", "vendor", "identifier", "status",
    "criticality", "healthStatus", "owner", "lastSeenAt",
  ]);
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    name: text(value.name, "Tên tài sản", { min: 2, max: 180 }),
    type: oneOf(value.type, "Loại tài sản", ["SERVER", "ENDPOINT", "NETWORK", "CLOUD", "APPLICATION", "SECURITY_DEVICE", "OTHER"]),
    vendor: text(value.vendor, "Nhà cung cấp", { max: 120, optional: true }),
    identifier: text(value.identifier, "Định danh", { max: 255, optional: true }),
    status: oneOf(value.status ?? "ACTIVE", "Trạng thái", ["ACTIVE", "MAINTENANCE", "RETIRED"]),
    criticality: oneOf(value.criticality ?? "MEDIUM", "Mức quan trọng", ["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    healthStatus: oneOf(value.healthStatus ?? "UNKNOWN", "Sức khỏe", ["HEALTHY", "DEGRADED", "DOWN", "UNKNOWN"]),
    owner: text(value.owner, "Đơn vị phụ trách", { max: 180, optional: true }),
    lastSeenAt: isoDateTime(value.lastSeenAt, "Lần cuối ghi nhận", { optional: true }),
  });
}

export function parseAssetPatch(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "name", "vendor", "identifier", "status", "criticality", "healthStatus",
    "owner", "lastSeenAt", "expectedVersion",
  ]);
  const parsed = removeUndefined({
    name: text(value.name, "Tên tài sản", { min: 2, max: 180, optional: true }),
    vendor: text(value.vendor, "Nhà cung cấp", { max: 120, optional: true }),
    identifier: text(value.identifier, "Định danh", { max: 255, optional: true }),
    status: oneOf(value.status, "Trạng thái", ["ACTIVE", "MAINTENANCE", "RETIRED"], { optional: true }),
    criticality: oneOf(value.criticality, "Mức quan trọng", ["CRITICAL", "HIGH", "MEDIUM", "LOW"], { optional: true }),
    healthStatus: oneOf(value.healthStatus, "Sức khỏe", ["HEALTHY", "DEGRADED", "DOWN", "UNKNOWN"], { optional: true }),
    owner: text(value.owner, "Đơn vị phụ trách", { max: 180, optional: true }),
    lastSeenAt: isoDateTime(value.lastSeenAt, "Lần cuối ghi nhận", { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật tài sản.");
  return parsed;
}

export function parseCreateLicense(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "tenantId", "productName", "vendor", "licenseReference", "quantity",
    "usedQuantity", "startsAt", "expiresAt", "status",
  ]);
  const quantity = positiveInteger(value.quantity, "Số lượng license", { maximum: 10_000_000 });
  const usedQuantity = nonNegativeInteger(value.usedQuantity ?? 0, "Số lượng đã dùng", { maximum: 10_000_000 });
  if (usedQuantity > quantity) validationFail("Số license đã dùng không thể lớn hơn tổng số lượng.");
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    productName: text(value.productName, "Tên sản phẩm", { min: 2, max: 180 }),
    vendor: text(value.vendor, "Nhà cung cấp", { max: 120, optional: true }),
    licenseReference: text(value.licenseReference, "Mã tham chiếu license", { max: 160, optional: true }),
    quantity,
    usedQuantity,
    startsAt: dateOnly(value.startsAt, "Ngày bắt đầu", { optional: true }),
    expiresAt: dateOnly(value.expiresAt, "Ngày hết hạn", { optional: true }),
    status: oneOf(value.status ?? "ACTIVE", "Trạng thái", ["ACTIVE", "EXPIRING", "EXPIRED", "SUSPENDED"]),
  });
}

export function parseLicensePatch(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "productName", "vendor", "licenseReference", "quantity", "usedQuantity",
    "startsAt", "expiresAt", "status", "expectedVersion",
  ]);
  const parsed = removeUndefined({
    productName: text(value.productName, "Tên sản phẩm", { min: 2, max: 180, optional: true }),
    vendor: text(value.vendor, "Nhà cung cấp", { max: 120, optional: true }),
    licenseReference: text(value.licenseReference, "Mã tham chiếu", { max: 160, optional: true }),
    quantity: value.quantity === undefined ? undefined : positiveInteger(value.quantity, "Số lượng", { maximum: 10_000_000 }),
    usedQuantity: nonNegativeInteger(value.usedQuantity, "Số lượng đã dùng", { maximum: 10_000_000, optional: true }),
    startsAt: dateOnly(value.startsAt, "Ngày bắt đầu", { optional: true }),
    expiresAt: dateOnly(value.expiresAt, "Ngày hết hạn", { optional: true }),
    status: oneOf(value.status, "Trạng thái", ["ACTIVE", "EXPIRING", "EXPIRED", "SUSPENDED"], { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật license.");
  return parsed;
}

export function parseAlertPatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["status", "severity", "expectedVersion"]);
  const parsed = removeUndefined({
    status: oneOf(value.status, "Trạng thái", ["OPEN", "ACKNOWLEDGED", "RESOLVED"], { optional: true }),
    severity: oneOf(value.severity, "Mức độ", ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"], { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật cảnh báo.");
  return parsed;
}

export function parseCreateContract(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "tenantId", "contractNumber", "title", "status", "startsAt", "expiresAt",
    "currency", "totalAmount",
  ]);
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    contractNumber: text(value.contractNumber, "Số hợp đồng", { max: 80 }),
    title: text(value.title, "Tên hợp đồng", { min: 2, max: 180 }),
    status: oneOf(value.status, "Trạng thái", ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]),
    startsAt: dateOnly(value.startsAt, "Ngày bắt đầu"),
    expiresAt: dateOnly(value.expiresAt, "Ngày hết hạn", { optional: true }),
    currency: text(value.currency ?? "VND", "Tiền tệ", { min: 3, max: 3 }).toUpperCase(),
    totalAmount: nonNegativeNumber(value.totalAmount, "Tổng giá trị", { optional: true }),
  });
}

export function parseContractPatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["title", "status", "expiresAt", "currency", "totalAmount", "expectedVersion"]);
  const parsed = removeUndefined({
    title: text(value.title, "Tên hợp đồng", { min: 2, max: 180, optional: true }),
    status: oneOf(value.status, "Trạng thái", ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"], { optional: true }),
    expiresAt: dateOnly(value.expiresAt, "Ngày hết hạn", { optional: true }),
    currency: value.currency === undefined ? undefined : text(value.currency, "Tiền tệ", { min: 3, max: 3 }).toUpperCase(),
    totalAmount: nonNegativeNumber(value.totalAmount, "Tổng giá trị", { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật hợp đồng.");
  return parsed;
}

export function parseCreateInvoice(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "tenantId", "contractId", "invoiceNumber", "amount", "currency", "status",
    "issuedAt", "dueAt",
  ]);
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    contractId: text(value.contractId, "Hợp đồng", { max: 36, optional: true }),
    invoiceNumber: text(value.invoiceNumber, "Số hóa đơn", { max: 80 }),
    amount: nonNegativeNumber(value.amount, "Số tiền"),
    currency: text(value.currency ?? "VND", "Tiền tệ", { min: 3, max: 3 }).toUpperCase(),
    status: oneOf(value.status, "Trạng thái", ["DRAFT", "ISSUED", "PAID", "OVERDUE", "VOID"]),
    issuedAt: dateOnly(value.issuedAt, "Ngày phát hành", { optional: true }),
    dueAt: dateOnly(value.dueAt, "Ngày đến hạn", { optional: true }),
  });
}

export function parseInvoicePatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["status", "issuedAt", "dueAt", "paidAt", "expectedVersion"]);
  const parsed = removeUndefined({
    status: oneOf(value.status, "Trạng thái", ["DRAFT", "ISSUED", "PAID", "OVERDUE", "VOID"], { optional: true }),
    issuedAt: dateOnly(value.issuedAt, "Ngày phát hành", { optional: true }),
    dueAt: dateOnly(value.dueAt, "Ngày đến hạn", { optional: true }),
    paidAt: isoDateTime(value.paidAt, "Thời điểm thanh toán", { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật hóa đơn.");
  return parsed;
}

export function parseCreateDocument(input) {
  const value = record(input);
  assertKnownKeys(value, [
    "tenantId", "type", "title", "description", "filename", "mediaType", "contentBase64",
  ]);
  const mediaType = oneOf(value.mediaType, "Định dạng", ["application/pdf", "text/plain", "text/markdown"]);
  const filename = text(value.filename, "Tên tệp", { max: 255 });
  if (/[\\/\u0000-\u001f]/.test(filename) || filename === "." || filename === "..") {
    validationFail("Tên tệp không hợp lệ.");
  }
  const encoded = text(value.contentBase64, "Nội dung tệp", { max: 13_981_016 });
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) validationFail("Nội dung base64 không hợp lệ.");
  const content = Buffer.from(encoded, "base64");
  if (content.length < 1 || content.length > 10 * 1024 * 1024) {
    validationFail("Tệp phải có kích thước từ 1 byte đến 10 MiB.");
  }
  if (mediaType === "application/pdf" && content.subarray(0, 5).toString("ascii") !== "%PDF-") {
    validationFail("Nội dung tệp không phải PDF hợp lệ.");
  }
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    type: oneOf(value.type, "Loại tài liệu", ["SECURITY_REPORT", "COMPLIANCE_REPORT", "INVOICE_ATTACHMENT", "OTHER"]),
    title: text(value.title, "Tiêu đề", { min: 2, max: 180 }),
    description: text(value.description, "Mô tả", { max: 2000, optional: true }),
    filename,
    mediaType,
    byteSize: content.length,
    contentSha256: createHash("sha256").update(content).digest("hex"),
    content,
  });
}

export function parseCreateKnowledgeArticle(input) {
  const value = record(input);
  assertKnownKeys(value, ["tenantId", "title", "summary", "body", "category", "audience", "status"]);
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    title: text(value.title, "Tiêu đề", { min: 3, max: 180 }),
    summary: text(value.summary, "Tóm tắt", { min: 10, max: 500 }),
    body: text(value.body, "Nội dung", { min: 20, max: 100_000 }),
    category: text(value.category, "Danh mục", { max: 80 }),
    audience: oneOf(value.audience ?? "CLIENT", "Đối tượng", ["CLIENT", "INTERNAL", "ALL"]),
    status: oneOf(value.status ?? "DRAFT", "Trạng thái", ["DRAFT", "PUBLISHED", "ARCHIVED"]),
  });
}

export function parseKnowledgePatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["title", "summary", "body", "category", "audience", "status", "expectedVersion"]);
  const parsed = removeUndefined({
    title: text(value.title, "Tiêu đề", { min: 3, max: 180, optional: true }),
    summary: text(value.summary, "Tóm tắt", { min: 10, max: 500, optional: true }),
    body: text(value.body, "Nội dung", { min: 20, max: 100_000, optional: true }),
    category: text(value.category, "Danh mục", { max: 80, optional: true }),
    audience: oneOf(value.audience, "Đối tượng", ["CLIENT", "INTERNAL", "ALL"], { optional: true }),
    status: oneOf(value.status, "Trạng thái", ["DRAFT", "PUBLISHED", "ARCHIVED"], { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật bài viết.");
  return parsed;
}

export function parseInvitation(input) {
  const value = record(input);
  assertKnownKeys(value, ["tenantId", "email", "role", "expiresAt"]);
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    email: email(value.email),
    role: oneOf(value.role, "Role", [
      "client_admin", "client_viewer", "billing", "technical",
      "soc_l1", "soc_l2", "soc_l3", "account_manager", "qts_admin",
    ]),
    expiresAt: isoDateTime(value.expiresAt, "Thời hạn lời mời"),
  });
}

export function parseMemberPatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["role", "status", "expectedVersion"]);
  const parsed = removeUndefined({
    role: oneOf(value.role, "Role", [
      "client_admin", "client_viewer", "billing", "technical",
      "soc_l1", "soc_l2", "soc_l3", "account_manager", "qts_admin",
    ], { optional: true }),
    status: oneOf(value.status, "Trạng thái", ["ACTIVE", "DISABLED"], { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật thành viên.");
  return parsed;
}

export function parseCreateShift(input) {
  const value = record(input);
  assertKnownKeys(value, ["tenantId", "engineerName", "level", "startsAt", "endsAt", "handoverNotes", "status"]);
  const startsAt = isoDateTime(value.startsAt, "Bắt đầu");
  const endsAt = isoDateTime(value.endsAt, "Kết thúc");
  if (Date.parse(endsAt) <= Date.parse(startsAt)) validationFail("Ca trực phải kết thúc sau thời điểm bắt đầu.");
  return removeUndefined({
    tenantId: tenantId(value.tenantId, { optional: true }),
    engineerName: text(value.engineerName, "Tên kỹ sư", { min: 2, max: 180 }),
    level: oneOf(value.level, "Cấp độ", ["L1", "L2", "L3", "MANAGER"]),
    startsAt,
    endsAt,
    handoverNotes: text(value.handoverNotes, "Ghi chú bàn giao", { max: 5000, optional: true }),
    status: oneOf(value.status ?? "SCHEDULED", "Trạng thái", ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]),
  });
}

export function parseShiftPatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["engineerName", "startsAt", "endsAt", "handoverNotes", "status", "expectedVersion"]);
  const parsed = removeUndefined({
    engineerName: text(value.engineerName, "Tên kỹ sư", { min: 2, max: 180, optional: true }),
    startsAt: isoDateTime(value.startsAt, "Bắt đầu", { optional: true }),
    endsAt: isoDateTime(value.endsAt, "Kết thúc", { optional: true }),
    handoverNotes: text(value.handoverNotes, "Ghi chú bàn giao", { max: 5000, optional: true }),
    status: oneOf(value.status, "Trạng thái", ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"], { optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (parsed.startsAt && parsed.endsAt && Date.parse(parsed.endsAt) <= Date.parse(parsed.startsAt)) {
    validationFail("Ca trực phải kết thúc sau thời điểm bắt đầu.");
  }
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật ca trực.");
  return parsed;
}

export function parseTicketComment(input) {
  const value = record(input);
  assertKnownKeys(value, ["body", "visibility"]);
  return {
    body: text(value.body, "Nội dung phản hồi", { min: 2, max: 10_000 }),
    visibility: oneOf(value.visibility ?? "CUSTOMER", "Phạm vi", ["CUSTOMER", "INTERNAL"]),
  };
}

export function parseIntegrationPatch(input) {
  const value = record(input);
  assertKnownKeys(value, ["name", "endpointUrl", "status", "secret", "expectedVersion"]);
  let endpointUrl;
  if (value.endpointUrl !== undefined) {
    endpointUrl = parseCreateIntegration({
      tenantId: "validation",
      name: "Validation integration",
      type: "OTHER",
      endpointUrl: value.endpointUrl,
    }).endpointUrl;
  }
  const parsed = removeUndefined({
    name: text(value.name, "Tên tích hợp", { min: 3, max: 160, optional: true }),
    endpointUrl,
    status: oneOf(value.status, "Trạng thái", ["CONFIGURED", "ACTIVE", "DEGRADED", "DISABLED"], { optional: true }),
    secret: text(value.secret, "Secret", { min: 16, max: 4096, optional: true }),
    expectedVersion: positiveInteger(value.expectedVersion, "expectedVersion"),
  });
  if (Object.keys(parsed).length === 1) validationFail("Cần ít nhất một trường để cập nhật tích hợp.");
  return parsed;
}

export function parseRequestedTenant(searchParams) {
  const value = searchParams.get("tenantId");
  return value ? tenantId(value) : undefined;
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export const schemaHelpers = Object.freeze({
  assertKnownKeys,
  dateOnly,
  email,
  isoDateTime,
  nonNegativeInteger,
  nonNegativeNumber,
  oneOf,
  positiveInteger,
  record,
  removeUndefined,
  tenantId,
  text,
});
