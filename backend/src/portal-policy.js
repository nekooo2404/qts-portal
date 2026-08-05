import { portalFail } from "./portal-errors.js";

const ALL_PERMISSIONS = Object.freeze([
  "dashboard.read",
  "contact_requests.read",
  "tenants.read",
  "tenants.write",
  "alerts.read",
  "alerts.write",
  "tickets.read",
  "tickets.create",
  "tickets.manage",
  "assets.read",
  "assets.write",
  "billing.read",
  "billing.write",
  "documents.read",
  "documents.write",
  "knowledge.read",
  "knowledge.write",
  "integrations.read",
  "integrations.write",
  "members.read",
  "members.write",
  "shifts.read",
  "shifts.write",
  "audit.read",
]);

const READ_ONLY_CLIENT = [
  "dashboard.read",
  "alerts.read",
  "tickets.read",
  "assets.read",
  "billing.read",
  "documents.read",
  "knowledge.read",
  "audit.read",
];

const ROLE_PERMISSIONS = Object.freeze({
  client_viewer: new Set(READ_ONLY_CLIENT),
  technical: new Set([
    ...READ_ONLY_CLIENT,
    "tickets.create",
    "integrations.read",
  ]),
  billing: new Set([
    "dashboard.read",
    "tickets.read",
    "tickets.create",
    "billing.read",
    "documents.read",
    "knowledge.read",
  ]),
  client_admin: new Set([
    ...READ_ONLY_CLIENT,
    "tickets.create",
    "integrations.read",
    "members.read",
    "members.write",
  ]),
  soc_l1: new Set([
    "dashboard.read",
    "tenants.read",
    "alerts.read",
    "alerts.write",
    "tickets.read",
    "tickets.create",
    "tickets.manage",
    "assets.read",
    "documents.read",
    "knowledge.read",
    "shifts.read",
    "audit.read",
  ]),
  soc_l2: new Set([
    "dashboard.read",
    "tenants.read",
    "alerts.read",
    "alerts.write",
    "tickets.read",
    "tickets.create",
    "tickets.manage",
    "assets.read",
    "assets.write",
    "documents.read",
    "documents.write",
    "knowledge.read",
    "integrations.read",
    "shifts.read",
    "shifts.write",
    "audit.read",
  ]),
  soc_l3: new Set([
    "dashboard.read",
    "tenants.read",
    "alerts.read",
    "alerts.write",
    "tickets.read",
    "tickets.create",
    "tickets.manage",
    "assets.read",
    "assets.write",
    "documents.read",
    "documents.write",
    "knowledge.read",
    "knowledge.write",
    "integrations.read",
    "shifts.read",
    "shifts.write",
    "audit.read",
  ]),
  account_manager: new Set([
    "dashboard.read",
    "contact_requests.read",
    "tenants.read",
    "tenants.write",
    "alerts.read",
    "tickets.read",
    "tickets.create",
    "tickets.manage",
    "assets.read",
    "assets.write",
    "billing.read",
    "billing.write",
    "documents.read",
    "documents.write",
    "knowledge.read",
    "knowledge.write",
    "integrations.read",
    "members.read",
    "shifts.read",
    "audit.read",
  ]),
  qts_admin: new Set(ALL_PERMISSIONS),
});

function authorizationOf(session) {
  const authorization = session?.authorization;
  if (
    !authorization ||
    typeof authorization.tenantId !== "string" ||
    typeof authorization.role !== "string" ||
    !new Set(["client", "internal"]).has(authorization.workspace)
  ) {
    portalFail(401, "SESSION_REQUIRED", "Cần đăng nhập để tiếp tục.");
  }
  return authorization;
}

export function hasPermission(session, permission) {
  const authorization = authorizationOf(session);
  return ROLE_PERMISSIONS[authorization.role]?.has(permission) === true;
}

export function assertPermission(session, permission) {
  if (!hasPermission(session, permission)) {
    portalFail(403, "PERMISSION_DENIED", "Tài khoản không có quyền thực hiện thao tác này.");
  }
}

export function resolveTenantScope(session, requestedTenantId) {
  const authorization = authorizationOf(session);
  const requested = typeof requestedTenantId === "string" && requestedTenantId.trim()
    ? requestedTenantId.trim()
    : null;

  if (authorization.workspace === "client") {
    if (requested && requested !== authorization.tenantId) {
      portalFail(403, "TENANT_SCOPE_DENIED", "Không được truy cập dữ liệu của tenant khác.");
    }
    return { tenantId: authorization.tenantId, isCrossTenant: false };
  }

  return { tenantId: requested, isCrossTenant: true };
}

export function canManageClientRole(role) {
  return new Set(["client_admin", "client_viewer", "billing", "technical"]).has(role);
}

export { ALL_PERMISSIONS, ROLE_PERMISSIONS };
