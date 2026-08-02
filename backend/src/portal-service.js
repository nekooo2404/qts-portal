import { assertPermission, resolveTenantScope } from "./portal-policy.js";
import { portalFail } from "./portal-errors.js";
import {
  parseCreateAlert,
  parseCreateTicket,
  parseListQuery,
  parseTicketPatch,
} from "./portal-schema.js";

const RESOURCE_ACCESS = Object.freeze({
  alerts: {
    read: "alerts.read",
    create: "alerts.write",
    update: "alerts.write",
    filters: ["status", "severity", "source"],
    sortFields: ["detectedAt", "severity", "status", "createdAt"],
  },
  tickets: {
    read: "tickets.read",
    create: "tickets.create",
    update: "tickets.manage",
    filters: ["status", "severity", "category", "assignee"],
    sortFields: ["createdAt", "dueAt", "severity", "status"],
  },
  assets: {
    read: "assets.read",
    create: "assets.write",
    update: "assets.write",
    filters: ["status", "criticality", "healthStatus", "type"],
    sortFields: ["name", "criticality", "healthStatus", "lastSeenAt", "createdAt"],
  },
  licenses: {
    read: "assets.read",
    create: "assets.write",
    update: "assets.write",
    filters: ["status", "vendor"],
    sortFields: ["productName", "expiresAt", "status", "createdAt"],
  },
  tenants: {
    read: "tenants.read",
    create: "tenants.write",
    update: "tenants.write",
    filters: ["status", "serviceTier"],
    sortFields: ["name", "status", "createdAt"],
  },
});

function accessFor(resource) {
  const access = RESOURCE_ACCESS[resource];
  if (!access) portalFail(404, "RESOURCE_NOT_FOUND", "Nhóm tài nguyên không tồn tại.");
  return access;
}

function concreteScope(actor, requestedTenantId) {
  const scope = resolveTenantScope(actor, requestedTenantId);
  if (!scope.tenantId) {
    portalFail(422, "TENANT_REQUIRED", "Cần chọn tenant cho thao tác này.");
  }
  return scope;
}

function validateIdempotencyKey(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    portalFail(
      422,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Ticket mới cần Idempotency-Key hợp lệ từ 8 đến 128 ký tự.",
    );
  }
  return value;
}

export function createPortalService({ repository } = {}) {
  if (!repository) throw new Error("Portal service requires a repository.");

  return Object.freeze({
    async getOverview({ actor, requestedTenantId } = {}) {
      assertPermission(actor, "dashboard.read");
      const scope = resolveTenantScope(actor, requestedTenantId);
      return repository.getOverview({ actor, scope });
    },

    async listResources({ actor, resource, searchParams = new URLSearchParams() } = {}) {
      const access = accessFor(resource);
      assertPermission(actor, access.read);
      const requestedTenantId = searchParams.get("tenantId") || undefined;
      const scope = resolveTenantScope(actor, requestedTenantId);
      const query = parseListQuery(searchParams, {
        filters: access.filters,
        sortFields: access.sortFields,
      });
      return repository.listResources({ actor, resource, scope, query });
    },

    async createResource({ actor, resource, input, idempotencyKey, context } = {}) {
      const access = accessFor(resource);
      assertPermission(actor, access.create);

      if (resource === "tickets") {
        const data = parseCreateTicket(input);
        const scope = concreteScope(actor, data.tenantId);
        return repository.createTicket({
          actor,
          context,
          data: { ...data, tenantId: scope.tenantId },
          idempotencyKey: validateIdempotencyKey(idempotencyKey),
          scope,
        });
      }

      if (resource === "alerts") {
        const data = parseCreateAlert(input);
        const scope = concreteScope(actor, data.tenantId);
        return repository.createResource({
          actor,
          context,
          data: { ...data, tenantId: scope.tenantId },
          resource,
          scope,
        });
      }

      portalFail(501, "RESOURCE_NOT_IMPLEMENTED", "Tài nguyên chưa hỗ trợ thao tác tạo.");
    },

    async updateResource({ actor, resource, id, input, context } = {}) {
      const access = accessFor(resource);
      assertPermission(actor, access.update);
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
        portalFail(422, "VALIDATION_ERROR", "ID tài nguyên không hợp lệ.");
      }

      if (resource === "tickets") {
        const data = parseTicketPatch(input);
        const scope = resolveTenantScope(actor, input?.tenantId);
        return repository.updateResource({
          actor,
          context,
          data,
          id,
          resource,
          scope,
        });
      }

      portalFail(501, "RESOURCE_NOT_IMPLEMENTED", "Tài nguyên chưa hỗ trợ cập nhật.");
    },
  });
}

export { RESOURCE_ACCESS };
