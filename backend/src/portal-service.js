import { ROLE_WORKSPACES } from "./auth-config.js";
import {
  assertPermission,
  canManageClientRole,
  resolveTenantScope,
} from "./portal-policy.js";
import { portalFail } from "./portal-errors.js";
import {
  parseAlertPatch,
  parseAssetPatch,
  parseContractPatch,
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
  parseIntegrationPatch,
  parseInvitation,
  parseInvoicePatch,
  parseKnowledgePatch,
  parseLicensePatch,
  parseListQuery,
  parseMemberPatch,
  parseShiftPatch,
  parseTenantPatch,
  parseTicketComment,
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
  contracts: {
    read: "billing.read",
    create: "billing.write",
    update: "billing.write",
    filters: ["status", "currency"],
    sortFields: ["title", "startsAt", "expiresAt", "status", "createdAt"],
  },
  invoices: {
    read: "billing.read",
    create: "billing.write",
    update: "billing.write",
    filters: ["status", "currency"],
    sortFields: ["invoiceNumber", "issuedAt", "dueAt", "status", "createdAt"],
  },
  documents: {
    read: "documents.read",
    create: "documents.write",
    update: "documents.write",
    filters: ["type", "mediaType"],
    sortFields: ["publishedAt", "title", "createdAt"],
  },
  knowledge: {
    read: "knowledge.read",
    create: "knowledge.write",
    update: "knowledge.write",
    filters: ["category", "audience", "status"],
    sortFields: ["publishedAt", "updatedAt", "title", "createdAt"],
  },
  integrations: {
    read: "integrations.read",
    create: "integrations.write",
    update: "integrations.write",
    filters: ["type", "status"],
    sortFields: ["name", "type", "status", "updatedAt"],
  },
  shifts: {
    read: "shifts.read",
    create: "shifts.write",
    update: "shifts.write",
    filters: ["level", "status"],
    sortFields: ["startsAt", "endsAt", "engineerName", "status"],
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

function assertResourceId(id, resource = "resource") {
  const pattern = resource === "tenants"
    ? /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
    : /^[0-9a-f-]{36}$/i;
  if (typeof id !== "string" || !pattern.test(id)) {
    portalFail(422, "VALIDATION_ERROR", "ID tài nguyên không hợp lệ.");
  }
}

function workspaceForRole(role) {
  const workspace = ROLE_WORKSPACES[role];
  if (!workspace) portalFail(422, "VALIDATION_ERROR", "Role không hợp lệ.");
  return workspace;
}

export function createPortalService({ repository, membershipRepository, now = Date.now } = {}) {
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

      if (resource === "tenants") {
        const data = parseCreateTenant(input);
        const scope = resolveTenantScope(actor);
        return repository.createTenant({ actor, context, data, scope });
      }

      const parsers = {
        assets: parseCreateAsset,
        licenses: parseCreateLicense,
        contracts: parseCreateContract,
        invoices: parseCreateInvoice,
        knowledge: parseCreateKnowledgeArticle,
        shifts: parseCreateShift,
      };
      if (parsers[resource]) {
        let data = parsers[resource](input);
        const scope = resource === "knowledge" && !data.tenantId
          ? resolveTenantScope(actor)
          : concreteScope(actor, data.tenantId);
        data = {
          ...data,
          tenantId: scope.tenantId,
          ...(resource === "knowledge" && data.status === "PUBLISHED"
            ? { publishedAt: new Date(now()).toISOString() }
            : {}),
        };
        return repository.createResource({ actor, context, data, resource, scope });
      }

      if (resource === "documents") {
        const data = parseCreateDocument(input);
        const scope = concreteScope(actor, data.tenantId);
        return repository.createDocument({
          actor,
          context,
          data: { ...data, tenantId: scope.tenantId },
          scope,
        });
      }

      if (resource === "integrations") {
        const data = parseCreateIntegration(input);
        const scope = concreteScope(actor, data.tenantId);
        return repository.createIntegration({
          actor,
          context,
          data: { ...data, tenantId: scope.tenantId },
          scope,
        });
      }

      portalFail(501, "RESOURCE_NOT_IMPLEMENTED", "Tài nguyên chưa hỗ trợ thao tác tạo.");
    },

    async updateResource({ actor, resource, id, input, context } = {}) {
      const access = accessFor(resource);
      assertPermission(actor, access.update);
      assertResourceId(id, resource);

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

      if (resource === "integrations") {
        const data = parseIntegrationPatch(input);
        return repository.updateIntegration({
          actor,
          context,
          data,
          id,
          scope: resolveTenantScope(actor),
        });
      }

      const parsers = {
        alerts: parseAlertPatch,
        assets: parseAssetPatch,
        licenses: parseLicensePatch,
        tenants: parseTenantPatch,
        contracts: parseContractPatch,
        invoices: parseInvoicePatch,
        knowledge: parseKnowledgePatch,
        shifts: parseShiftPatch,
      };
      if (parsers[resource]) {
        const data = parsers[resource](input);
        return repository.updateResource({
          actor,
          context,
          data,
          id,
          resource,
          scope: resolveTenantScope(actor),
        });
      }

      portalFail(501, "RESOURCE_NOT_IMPLEMENTED", "Tài nguyên chưa hỗ trợ cập nhật.");
    },

    async listTicketComments({ actor, id } = {}) {
      assertPermission(actor, "tickets.read");
      assertResourceId(id);
      return repository.listTicketComments({
        actor,
        id,
        scope: resolveTenantScope(actor),
      });
    },

    async createTicketComment({ actor, context, id, input } = {}) {
      assertPermission(actor, "tickets.create");
      assertResourceId(id);
      const data = parseTicketComment(input);
      if (actor.authorization.workspace === "client" && data.visibility === "INTERNAL") {
        portalFail(403, "PERMISSION_DENIED", "Khách hàng không thể tạo ghi chú nội bộ.");
      }
      return repository.createTicketComment({
        actor,
        context,
        data,
        id,
        scope: resolveTenantScope(actor),
      });
    },

    async getDocument({ actor, context, id } = {}) {
      assertPermission(actor, "documents.read");
      assertResourceId(id);
      return repository.getDocument({
        actor,
        context,
        id,
        scope: resolveTenantScope(actor),
      });
    },

    async listMembers({ actor, searchParams = new URLSearchParams() } = {}) {
      assertPermission(actor, "members.read");
      const scope = resolveTenantScope(actor, searchParams.get("tenantId") || undefined);
      const query = parseListQuery(searchParams, {
        filters: ["role", "status"],
        sortFields: ["createdAt"],
      });
      return repository.listMembers({ actor, query, scope });
    },

    async updateMember({ actor, context, id, input } = {}) {
      assertPermission(actor, "members.write");
      assertResourceId(id);
      const data = parseMemberPatch(input);
      if (
        actor.authorization.workspace === "client" &&
        data.role &&
        !canManageClientRole(data.role)
      ) {
        portalFail(403, "PERMISSION_DENIED", "Client admin chỉ được cấp role khách hàng.");
      }
      return repository.updateMember({
        actor,
        context,
        data,
        id,
        scope: resolveTenantScope(actor),
        workspaceForRole,
      });
    },

    async listInvitations({ actor, searchParams = new URLSearchParams() } = {}) {
      assertPermission(actor, "members.read");
      const scope = resolveTenantScope(actor, searchParams.get("tenantId") || undefined);
      const query = parseListQuery(searchParams, {
        filters: ["status"],
        sortFields: ["createdAt"],
      });
      return repository.listInvitations({ actor, query, scope });
    },

    async createInvitation({ actor, context, input } = {}) {
      assertPermission(actor, "members.write");
      if (!membershipRepository) {
        portalFail(503, "MEMBERSHIP_STORE_UNAVAILABLE", "Kho thành viên chưa sẵn sàng.");
      }
      const data = parseInvitation(input);
      if (
        actor.authorization.workspace === "client" &&
        !canManageClientRole(data.role)
      ) {
        portalFail(403, "PERMISSION_DENIED", "Client admin chỉ được cấp role khách hàng.");
      }
      const scope = concreteScope(actor, data.tenantId);
      const expiresAt = Date.parse(data.expiresAt);
      const currentTime = now();
      if (expiresAt <= currentTime || expiresAt > currentTime + 30 * 24 * 60 * 60 * 1000) {
        portalFail(422, "VALIDATION_ERROR", "Lời mời phải hết hạn trong vòng 30 ngày tới.");
      }
      return membershipRepository.createInvitation({
        actor,
        context,
        email: data.email,
        expiresAt: new Date(expiresAt),
        role: data.role,
        scope,
        tenantId: scope.tenantId,
        workspace: workspaceForRole(data.role),
      });
    },

    async listAudit({ actor, searchParams = new URLSearchParams() } = {}) {
      assertPermission(actor, "audit.read");
      const scope = resolveTenantScope(actor, searchParams.get("tenantId") || undefined);
      const query = parseListQuery(searchParams, {
        filters: ["action", "outcome", "resourceType"],
        sortFields: ["createdAt"],
      });
      return repository.listAudit({ actor, query, scope });
    },
  });
}

export { RESOURCE_ACCESS };
