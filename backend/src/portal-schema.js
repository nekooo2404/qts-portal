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

function isoDateTime(value, name, { optional = false } = {}) {
  if ((value === undefined || value === null || value === "") && optional) return undefined;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    validationFail(`${name} phải là thời gian ISO 8601 hợp lệ.`);
  }
  return new Date(value).toISOString();
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

export function parseRequestedTenant(searchParams) {
  const value = searchParams.get("tenantId");
  return value ? tenantId(value) : undefined;
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export const schemaHelpers = Object.freeze({
  assertKnownKeys,
  isoDateTime,
  oneOf,
  positiveInteger,
  record,
  removeUndefined,
  tenantId,
  text,
});
