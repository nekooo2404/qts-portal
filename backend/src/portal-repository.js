import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";

import { withDatabaseScope } from "./database.js";
import { portalFail } from "./portal-errors.js";

const RESOURCE_DEFINITIONS = Object.freeze({
  tenants: {
    table: "tenants",
    tenantColumn: "id",
    columns: [
      "id", "name", "status", "service_tier", "emergency_contact_name",
      "emergency_contact_email", "emergency_contact_phone", "notes",
      "sla_critical_minutes", "sla_high_minutes", "sla_medium_minutes",
      "sla_low_minutes", "version", "created_at", "updated_at",
    ],
    updateFields: {
      name: "name",
      status: "status",
      serviceTier: "service_tier",
      emergencyContactName: "emergency_contact_name",
      emergencyContactEmail: "emergency_contact_email",
      emergencyContactPhone: "emergency_contact_phone",
      notes: "notes",
      slaCriticalMinutes: "sla_critical_minutes",
      slaHighMinutes: "sla_high_minutes",
      slaMediumMinutes: "sla_medium_minutes",
      slaLowMinutes: "sla_low_minutes",
    },
    filters: { status: "status", serviceTier: "service_tier" },
    sorts: { name: "name", status: "status", createdAt: "created_at" },
    search: ["id", "name", "emergency_contact_name", "emergency_contact_email"],
  },
  alerts: {
    table: "alerts",
    columns: [
      "id", "tenant_id", "external_ref", "title", "description", "severity",
      "status", "source", "asset_id", "detected_at", "acknowledged_at",
      "resolved_at", "version", "created_at", "updated_at",
    ],
    createFields: {
      externalRef: "external_ref",
      title: "title",
      description: "description",
      severity: "severity",
      source: "source",
      assetId: "asset_id",
      detectedAt: "detected_at",
    },
    updateFields: { status: "status", severity: "severity" },
    filters: { status: "status", severity: "severity", source: "source" },
    sorts: {
      detectedAt: "detected_at",
      severity: "severity",
      status: "status",
      createdAt: "created_at",
    },
    search: ["title", "description", "source", "external_ref"],
  },
  tickets: {
    table: "tickets",
    columns: [
      "id", "tenant_id", "sequence_number", "category", "subject", "description",
      "severity", "status", "reporter_name", "assignee", "sla_minutes", "due_at",
      "first_response_at", "resolved_at", "version", "created_at", "updated_at",
    ],
    updateFields: { status: "status", severity: "severity", assignee: "assignee" },
    filters: {
      status: "status",
      severity: "severity",
      category: "category",
      assignee: "assignee",
    },
    sorts: {
      createdAt: "created_at",
      dueAt: "due_at",
      severity: "severity",
      status: "status",
    },
    search: ["subject", "description", "reporter_name", "assignee"],
  },
  assets: {
    table: "assets",
    columns: [
      "id", "tenant_id", "name", "type", "vendor", "identifier", "status",
      "criticality", "health_status", "owner", "last_seen_at", "version",
      "created_at", "updated_at",
    ],
    createFields: {
      name: "name",
      type: "type",
      vendor: "vendor",
      identifier: "identifier",
      status: "status",
      criticality: "criticality",
      healthStatus: "health_status",
      owner: "owner",
      lastSeenAt: "last_seen_at",
    },
    updateFields: {
      name: "name",
      vendor: "vendor",
      identifier: "identifier",
      status: "status",
      criticality: "criticality",
      healthStatus: "health_status",
      owner: "owner",
      lastSeenAt: "last_seen_at",
    },
    filters: {
      status: "status",
      criticality: "criticality",
      healthStatus: "health_status",
      type: "type",
    },
    sorts: {
      name: "name",
      criticality: "criticality",
      healthStatus: "health_status",
      lastSeenAt: "last_seen_at",
      createdAt: "created_at",
    },
    search: ["name", "vendor", "identifier", "owner"],
  },
  licenses: {
    table: "licenses",
    columns: [
      "id", "tenant_id", "product_name", "vendor", "license_reference", "quantity",
      "used_quantity", "starts_at", "expires_at", "status", "version",
      "created_at", "updated_at",
    ],
    createFields: {
      productName: "product_name",
      vendor: "vendor",
      licenseReference: "license_reference",
      quantity: "quantity",
      usedQuantity: "used_quantity",
      startsAt: "starts_at",
      expiresAt: "expires_at",
      status: "status",
    },
    updateFields: {
      productName: "product_name",
      vendor: "vendor",
      licenseReference: "license_reference",
      quantity: "quantity",
      usedQuantity: "used_quantity",
      startsAt: "starts_at",
      expiresAt: "expires_at",
      status: "status",
    },
    filters: { status: "status", vendor: "vendor" },
    sorts: {
      productName: "product_name",
      expiresAt: "expires_at",
      status: "status",
      createdAt: "created_at",
    },
    search: ["product_name", "vendor", "license_reference"],
  },
  contracts: {
    table: "contracts",
    columns: [
      "id", "tenant_id", "contract_number", "title", "status", "starts_at",
      "expires_at", "currency", "total_amount", "version", "created_at", "updated_at",
    ],
    createFields: {
      contractNumber: "contract_number",
      title: "title",
      status: "status",
      startsAt: "starts_at",
      expiresAt: "expires_at",
      currency: "currency",
      totalAmount: "total_amount",
    },
    updateFields: {
      title: "title",
      status: "status",
      expiresAt: "expires_at",
      currency: "currency",
      totalAmount: "total_amount",
    },
    filters: { status: "status", currency: "currency" },
    sorts: { title: "title", startsAt: "starts_at", expiresAt: "expires_at", status: "status", createdAt: "created_at" },
    search: ["contract_number", "title"],
  },
  invoices: {
    table: "invoices",
    columns: [
      "id", "tenant_id", "contract_id", "invoice_number", "amount", "currency",
      "status", "issued_at", "due_at", "paid_at", "version", "created_at", "updated_at",
    ],
    createFields: {
      contractId: "contract_id",
      invoiceNumber: "invoice_number",
      amount: "amount",
      currency: "currency",
      status: "status",
      issuedAt: "issued_at",
      dueAt: "due_at",
    },
    updateFields: {
      status: "status",
      issuedAt: "issued_at",
      dueAt: "due_at",
      paidAt: "paid_at",
    },
    filters: { status: "status", currency: "currency" },
    sorts: { invoiceNumber: "invoice_number", issuedAt: "issued_at", dueAt: "due_at", status: "status", createdAt: "created_at" },
    search: ["invoice_number"],
  },
  documents: {
    table: "documents",
    columns: [
      "id", "tenant_id", "type", "title", "description", "filename", "media_type",
      "byte_size", "content_sha256", "published_at", "created_at",
    ],
    filters: { type: "type", mediaType: "media_type" },
    sorts: { title: "title", publishedAt: "published_at", createdAt: "created_at" },
    search: ["title", "description", "filename"],
  },
  knowledge: {
    table: "knowledge_articles",
    allowsGlobalTenant: true,
    columns: [
      "id", "tenant_id", "title", "summary", "body", "category", "audience",
      "status", "version", "published_at", "created_at", "updated_at",
    ],
    createFields: {
      title: "title",
      summary: "summary",
      body: "body",
      category: "category",
      audience: "audience",
      status: "status",
      publishedAt: "published_at",
    },
    updateFields: {
      title: "title",
      summary: "summary",
      body: "body",
      category: "category",
      audience: "audience",
      status: "status",
    },
    filters: { category: "category", audience: "audience", status: "status" },
    sorts: { title: "title", publishedAt: "published_at", updatedAt: "updated_at", createdAt: "created_at" },
    search: ["title", "summary", "body", "category"],
  },
  integrations: {
    table: "integrations",
    columns: [
      "id", "tenant_id", "name", "type", "endpoint_url", "status", "secret_hint",
      "last_checked_at", "version", "created_at", "updated_at",
    ],
    computedColumns: ["(r.secret_ciphertext IS NOT NULL) AS has_secret"],
    updateFields: {
      name: "name",
      endpointUrl: "endpoint_url",
      status: "status",
    },
    filters: { type: "type", status: "status" },
    sorts: { name: "name", type: "type", status: "status", updatedAt: "updated_at" },
    search: ["name", "type", "endpoint_url"],
  },
  shifts: {
    table: "soc_shifts",
    columns: [
      "id", "tenant_id", "engineer_name", "level", "starts_at", "ends_at",
      "handover_notes", "status", "version", "created_at", "updated_at",
    ],
    createFields: {
      engineerName: "engineer_name",
      level: "level",
      startsAt: "starts_at",
      endsAt: "ends_at",
      handoverNotes: "handover_notes",
      status: "status",
    },
    updateFields: {
      engineerName: "engineer_name",
      startsAt: "starts_at",
      endsAt: "ends_at",
      handoverNotes: "handover_notes",
      status: "status",
    },
    filters: { level: "level", status: "status" },
    sorts: { startsAt: "starts_at", endsAt: "ends_at", engineerName: "engineer_name", status: "status" },
    search: ["engineer_name", "handover_notes"],
  },
});

function camelCase(value) {
  return value.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
}

export function serializeDatabaseRow(row) {
  const serialized = {};
  for (const [key, value] of Object.entries(row)) {
    serialized[camelCase(key)] = value;
  }
  if (serialized.sequenceNumber !== undefined) {
    serialized.reference = `QTS-${serialized.sequenceNumber}`;
  }
  return serialized;
}

function definitionFor(resource) {
  const definition = RESOURCE_DEFINITIONS[resource];
  if (!definition) portalFail(404, "RESOURCE_NOT_FOUND", "Nhóm tài nguyên không tồn tại.");
  return definition;
}

function whereForList(definition, scope, query, actor) {
  const parameters = [];
  const clauses = [];
  const tenantColumn = definition.tenantColumn ?? "tenant_id";
  if (scope.tenantId) {
    parameters.push(scope.tenantId);
    clauses.push(definition.allowsGlobalTenant
      ? `(r.${tenantColumn} = $${parameters.length} OR r.${tenantColumn} IS NULL)`
      : `r.${tenantColumn} = $${parameters.length}`);
  }
  if (definition.table === "knowledge_articles" && actor?.authorization.workspace === "client") {
    clauses.push("r.status = 'PUBLISHED'");
    clauses.push("r.audience IN ('CLIENT', 'ALL')");
  }
  for (const [key, value] of Object.entries(query.filters)) {
    const column = definition.filters[key];
    if (!column) continue;
    parameters.push(value);
    clauses.push(`r.${column} = $${parameters.length}`);
  }
  if (query.search) {
    parameters.push(`%${query.search}%`);
    const index = parameters.length;
    clauses.push(`(${definition.search.map((column) => `r.${column} ILIKE $${index}`).join(" OR ")})`);
  }
  return {
    parameters,
    sql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
  };
}

function selectColumns(definition, includeTenantName) {
  const selected = definition.columns.map((column) => `r.${column}`);
  selected.push(...(definition.computedColumns ?? []));
  if (includeTenantName) selected.push("t.name AS tenant_name");
  return selected.join(", ");
}

async function appendAudit(client, { actor, context, action, resource, resourceId, tenantId, metadata }) {
  const address = context?.ipAddress;
  await client.query(
    `INSERT INTO audit_events (
       tenant_id, actor_issuer, actor_subject, actor_role, action,
       resource_type, resource_id, outcome, request_id, ip_address, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUCCESS', $8, $9, $10::jsonb)`,
    [
      tenantId,
      actor.identity.issuer,
      actor.identity.subject,
      actor.authorization.role,
      action,
      resource,
      resourceId,
      context?.requestId ?? null,
      typeof address === "string" && isIP(address) ? address : null,
      JSON.stringify(metadata ?? {}),
    ],
  );
}

function fingerprintTicket(data, actor) {
  return createHash("sha256")
    .update(JSON.stringify({
      tenantId: data.tenantId,
      subject: data.subject,
      description: data.description,
      category: data.category,
      severity: data.severity,
      reporterIssuer: actor.identity.issuer,
      reporterSubject: actor.identity.subject,
    }))
    .digest("hex");
}

function slaColumnForSeverity(severity) {
  return {
    CRITICAL: "sla_critical_minutes",
    HIGH: "sla_high_minutes",
    MEDIUM: "sla_medium_minutes",
    LOW: "sla_low_minutes",
  }[severity];
}

export function createPortalRepository(database, { secretCipher } = {}) {
  if (!database) throw new Error("Portal repository requires a database.");

  return Object.freeze({
    async getOverview({ scope }) {
      return withDatabaseScope(database, scope, async (client) => {
        const parameters = scope.tenantId ? [scope.tenantId] : [];
        const tenantFilter = scope.tenantId ? "AND tenant_id = $1" : "";
        const tenantResult = scope.tenantId
          ? await client.query(
            `SELECT id, name, status, service_tier
             FROM tenants WHERE id = $1`,
            parameters,
          )
          : await client.query("SELECT count(*)::int AS tenant_count FROM tenants");

        const metrics = await client.query(
          `SELECT
             (SELECT count(*)::int FROM alerts WHERE status <> 'RESOLVED' ${tenantFilter}) AS open_alerts,
             (SELECT count(*)::int FROM alerts WHERE status <> 'RESOLVED' AND severity = 'CRITICAL' ${tenantFilter}) AS critical_alerts,
             (SELECT count(*)::int FROM tickets WHERE status NOT IN ('RESOLVED', 'CLOSED') ${tenantFilter}) AS active_tickets,
             (SELECT count(*)::int FROM tickets WHERE status NOT IN ('RESOLVED', 'CLOSED') AND due_at < CURRENT_TIMESTAMP ${tenantFilter}) AS sla_breached,
             (SELECT count(*)::int FROM assets WHERE status <> 'RETIRED' ${tenantFilter}) AS total_assets,
             (SELECT count(*)::int FROM assets WHERE status <> 'RETIRED' AND health_status = 'HEALTHY' ${tenantFilter}) AS healthy_assets,
             (SELECT count(*)::int FROM licenses WHERE status = 'EXPIRING' ${tenantFilter}) AS expiring_licenses,
             (SELECT count(*)::int FROM invoices WHERE status IN ('ISSUED', 'OVERDUE') ${tenantFilter}) AS unpaid_invoices,
             CURRENT_TIMESTAMP AS generated_at`,
          parameters,
        );

        const severity = await client.query(
          `SELECT severity, count(*)::int AS count
           FROM alerts
           WHERE status <> 'RESOLVED' ${tenantFilter}
           GROUP BY severity
           ORDER BY CASE severity
             WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3
             WHEN 'LOW' THEN 4 ELSE 5 END`,
          parameters,
        );
        const assetHealth = await client.query(
          `SELECT health_status, count(*)::int AS count
           FROM assets
           WHERE status <> 'RETIRED' ${tenantFilter}
           GROUP BY health_status
           ORDER BY health_status`,
          parameters,
        );
        const trend = await client.query(
          `WITH days AS (
             SELECT generate_series(
               date_trunc('day', CURRENT_TIMESTAMP) - INTERVAL '6 days',
               date_trunc('day', CURRENT_TIMESTAMP),
               INTERVAL '1 day'
             ) AS day
           )
           SELECT
             days.day,
             count(alerts.id) FILTER (WHERE alerts.severity = 'CRITICAL')::int AS critical,
             count(alerts.id) FILTER (WHERE alerts.severity = 'HIGH')::int AS high,
             count(alerts.id) FILTER (WHERE alerts.severity = 'MEDIUM')::int AS medium,
             count(alerts.id) FILTER (WHERE alerts.severity IN ('LOW', 'INFO'))::int AS low
           FROM days
           LEFT JOIN alerts
             ON date_trunc('day', alerts.detected_at) = days.day
             ${scope.tenantId ? "AND alerts.tenant_id = $1" : ""}
           GROUP BY days.day
           ORDER BY days.day`,
          parameters,
        );
        const recentAlerts = await client.query(
          `SELECT a.id, a.tenant_id, t.name AS tenant_name, a.title, a.severity,
                  a.status, a.source, a.detected_at
           FROM alerts a
           JOIN tenants t ON t.id = a.tenant_id
           ${scope.tenantId ? "WHERE a.tenant_id = $1" : ""}
           ORDER BY a.detected_at DESC
           LIMIT 6`,
          parameters,
        );
        const recentTickets = await client.query(
          `SELECT k.id, k.tenant_id, t.name AS tenant_name, k.sequence_number,
                  k.subject, k.severity, k.status, k.assignee, k.due_at, k.version,
                  k.created_at
           FROM tickets k
           JOIN tenants t ON t.id = k.tenant_id
           ${scope.tenantId ? "WHERE k.tenant_id = $1" : ""}
           ORDER BY k.created_at DESC
           LIMIT 6`,
          parameters,
        );

        const metricRow = serializeDatabaseRow(metrics.rows[0]);
        const generatedAt = metricRow.generatedAt;
        delete metricRow.generatedAt;
        return {
          scope: scope.tenantId
            ? { kind: "TENANT", ...serializeDatabaseRow(tenantResult.rows[0]) }
            : { kind: "ALL_TENANTS", tenantCount: tenantResult.rows[0].tenant_count },
          metrics: metricRow,
          severityBreakdown: severity.rows.map(serializeDatabaseRow),
          assetHealth: assetHealth.rows.map(serializeDatabaseRow),
          threatSeries: trend.rows.map(serializeDatabaseRow),
          recentAlerts: recentAlerts.rows.map(serializeDatabaseRow),
          recentTickets: recentTickets.rows.map(serializeDatabaseRow),
          generatedAt,
        };
      });
    },

    async listResources({ actor, resource, scope, query }) {
      const definition = definitionFor(resource);
      return withDatabaseScope(database, scope, async (client) => {
        const where = whereForList(definition, scope, query, actor);
        const includeTenantName = resource !== "tenants";
        const join = includeTenantName
          ? `${definition.allowsGlobalTenant ? "LEFT" : "INNER"} JOIN tenants t ON t.id = r.tenant_id`
          : "";
        const countResult = await client.query(
          `SELECT count(*)::int AS total
           FROM ${definition.table} r
           ${join}
           ${where.sql}`,
          where.parameters,
        );
        const sortColumn = definition.sorts[query.sortBy];
        const offset = (query.page - 1) * query.pageSize;
        const dataParameters = [...where.parameters, query.pageSize, offset];
        const rows = await client.query(
          `SELECT ${selectColumns(definition, includeTenantName)}
           FROM ${definition.table} r
           ${join}
           ${where.sql}
           ORDER BY r.${sortColumn} ${query.sortOrder === "asc" ? "ASC" : "DESC"}, r.id ASC
           LIMIT $${dataParameters.length - 1} OFFSET $${dataParameters.length}`,
          dataParameters,
        );
        const totalItems = countResult.rows[0].total;
        return {
          data: rows.rows.map(serializeDatabaseRow),
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / query.pageSize),
          },
        };
      });
    },

    async createResource({ actor, context, data, resource, scope }) {
      const definition = definitionFor(resource);
      if (!definition.createFields) {
        portalFail(405, "RESOURCE_READ_ONLY", "Tài nguyên không hỗ trợ thao tác tạo.");
      }
      const id = randomUUID();
      return withDatabaseScope(database, scope, async (client) => {
        const entries = Object.entries(definition.createFields)
          .filter(([key]) => data[key] !== undefined);
        const columns = ["id", "tenant_id", ...entries.map(([, column]) => column)];
        const values = [id, data.tenantId, ...entries.map(([key]) => data[key])];
        const placeholders = values.map((_value, index) => `$${index + 1}`);
        const result = await client.query(
          `INSERT INTO ${definition.table} (${columns.join(", ")})
           VALUES (${placeholders.join(", ")})
           RETURNING ${definition.columns.join(", ")}`,
          values,
        );
        await appendAudit(client, {
          actor,
          context,
          action: `${resource}.create`,
          resource,
          resourceId: id,
          tenantId: data.tenantId,
          metadata: { fields: entries.map(([key]) => key) },
        });
        return serializeDatabaseRow(result.rows[0]);
      });
    },

    async createTicket({ actor, context, data, idempotencyKey, scope }) {
      return withDatabaseScope(database, scope, async (client) => {
        const fingerprint = fingerprintTicket(data, actor);
        const existing = await client.query(
          `SELECT ${RESOURCE_DEFINITIONS.tickets.columns.join(", ")}, request_fingerprint
           FROM tickets
           WHERE tenant_id = $1 AND idempotency_key = $2
           FOR UPDATE`,
          [data.tenantId, idempotencyKey],
        );
        if (existing.rowCount > 0) {
          if (existing.rows[0].request_fingerprint !== fingerprint) {
            portalFail(409, "IDEMPOTENCY_CONFLICT", "Idempotency-Key đã được dùng cho nội dung khác.");
          }
          const row = { ...existing.rows[0] };
          delete row.request_fingerprint;
          return serializeDatabaseRow(row);
        }

        const slaColumn = slaColumnForSeverity(data.severity);
        const tenant = await client.query(
          `SELECT ${slaColumn} AS sla_minutes FROM tenants WHERE id = $1`,
          [data.tenantId],
        );
        if (tenant.rowCount === 0) portalFail(404, "TENANT_NOT_FOUND", "Tenant không tồn tại.");
        const slaMinutes = tenant.rows[0].sla_minutes;
        const id = randomUUID();
        const result = await client.query(
          `INSERT INTO tickets (
             id, tenant_id, category, subject, description, severity,
             reporter_issuer, reporter_subject, reporter_name,
             sla_minutes, due_at, idempotency_key, request_fingerprint
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9,
             $10, CASE WHEN $10::integer IS NULL THEN NULL
                       ELSE CURRENT_TIMESTAMP + ($10::integer * INTERVAL '1 minute') END,
             $11, $12
           )
           RETURNING ${RESOURCE_DEFINITIONS.tickets.columns.join(", ")}`,
          [
            id,
            data.tenantId,
            data.category,
            data.subject,
            data.description,
            data.severity,
            actor.identity.issuer,
            actor.identity.subject,
            actor.user.displayName,
            slaMinutes,
            idempotencyKey,
            fingerprint,
          ],
        );
        await appendAudit(client, {
          actor,
          context,
          action: "tickets.create",
          resource: "tickets",
          resourceId: id,
          tenantId: data.tenantId,
          metadata: { category: data.category, severity: data.severity },
        });
        return serializeDatabaseRow(result.rows[0]);
      });
    },

    async createTenant({ actor, context, data, scope }) {
      return withDatabaseScope(database, scope, async (client) => {
        const fields = {
          name: "name",
          status: "status",
          serviceTier: "service_tier",
          emergencyContactName: "emergency_contact_name",
          emergencyContactEmail: "emergency_contact_email",
          emergencyContactPhone: "emergency_contact_phone",
          notes: "notes",
          slaCriticalMinutes: "sla_critical_minutes",
          slaHighMinutes: "sla_high_minutes",
          slaMediumMinutes: "sla_medium_minutes",
          slaLowMinutes: "sla_low_minutes",
        };
        const entries = Object.entries(fields).filter(([key]) => data[key] !== undefined);
        const columns = ["id", ...entries.map(([, column]) => column)];
        const values = [data.id, ...entries.map(([key]) => data[key])];
        const result = await client.query(
          `INSERT INTO tenants (${columns.join(", ")})
           VALUES (${values.map((_item, index) => `$${index + 1}`).join(", ")})
           RETURNING ${RESOURCE_DEFINITIONS.tenants.columns.join(", ")}`,
          values,
        );
        await appendAudit(client, {
          actor,
          context,
          action: "tenants.create",
          resource: "tenants",
          resourceId: data.id,
          tenantId: data.id,
          metadata: { fields: entries.map(([key]) => key) },
        });
        return serializeDatabaseRow(result.rows[0]);
      });
    },

    async createDocument({ actor, context, data, scope }) {
      const id = randomUUID();
      return withDatabaseScope(database, scope, async (client) => {
        const result = await client.query(
          `INSERT INTO documents (
             id, tenant_id, type, title, description, filename, media_type,
             byte_size, content_sha256, content, created_by_issuer, created_by_subject
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING ${RESOURCE_DEFINITIONS.documents.columns.join(", ")}`,
          [
            id,
            data.tenantId,
            data.type,
            data.title,
            data.description ?? null,
            data.filename,
            data.mediaType,
            data.byteSize,
            data.contentSha256,
            data.content,
            actor.identity.issuer,
            actor.identity.subject,
          ],
        );
        await appendAudit(client, {
          actor,
          context,
          action: "documents.create",
          resource: "documents",
          resourceId: id,
          tenantId: data.tenantId,
          metadata: {
            mediaType: data.mediaType,
            byteSize: data.byteSize,
            contentSha256: data.contentSha256,
          },
        });
        return serializeDatabaseRow(result.rows[0]);
      });
    },

    async getDocument({ actor, context, id, scope }) {
      return withDatabaseScope(database, scope, async (client) => {
        const result = await client.query(
          `SELECT id, tenant_id, title, filename, media_type, byte_size,
                  content_sha256, content
           FROM documents
           WHERE id = $1`,
          [id],
        );
        if (result.rowCount === 0) portalFail(404, "DOCUMENT_NOT_FOUND", "Không tìm thấy tài liệu.");
        const row = result.rows[0];
        await appendAudit(client, {
          actor,
          context,
          action: "documents.download",
          resource: "documents",
          resourceId: id,
          tenantId: row.tenant_id,
          metadata: { contentSha256: row.content_sha256 },
        });
        return {
          id: row.id,
          tenantId: row.tenant_id,
          title: row.title,
          filename: row.filename,
          mediaType: row.media_type,
          byteSize: row.byte_size,
          contentSha256: row.content_sha256,
          content: row.content,
        };
      });
    },

    async createIntegration({ actor, context, data, scope }) {
      if (data.secret && !secretCipher) {
        portalFail(503, "SECRET_STORAGE_UNAVAILABLE", "Kho mã hóa secret chưa được cấu hình.");
      }
      const id = randomUUID();
      const secretCiphertext = data.secret ? secretCipher.encrypt(data.secret) : null;
      const secretHint = data.secret ? data.secret.slice(-4) : null;
      return withDatabaseScope(database, scope, async (client) => {
        const result = await client.query(
          `INSERT INTO integrations (
             id, tenant_id, name, type, endpoint_url, secret_ciphertext, secret_hint
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, tenant_id, name, type, endpoint_url, status, secret_hint,
                     (secret_ciphertext IS NOT NULL) AS has_secret,
                     last_checked_at, version, created_at, updated_at`,
          [
            id,
            data.tenantId,
            data.name,
            data.type,
            data.endpointUrl,
            secretCiphertext,
            secretHint,
          ],
        );
        await appendAudit(client, {
          actor,
          context,
          action: "integrations.create",
          resource: "integrations",
          resourceId: id,
          tenantId: data.tenantId,
          metadata: { type: data.type, hasSecret: Boolean(data.secret) },
        });
        return serializeDatabaseRow(result.rows[0]);
      });
    },

    async updateIntegration({ actor, context, data, id, scope }) {
      if (data.secret && !secretCipher) {
        portalFail(503, "SECRET_STORAGE_UNAVAILABLE", "Kho mã hóa secret chưa được cấu hình.");
      }
      return withDatabaseScope(database, scope, async (client) => {
        const definition = RESOURCE_DEFINITIONS.integrations;
        const entries = Object.entries(definition.updateFields)
          .filter(([key]) => data[key] !== undefined);
        const values = entries.map(([key]) => data[key]);
        const assignments = entries.map(([, column], index) => `${column} = $${index + 1}`);
        if (data.secret) {
          values.push(secretCipher.encrypt(data.secret), data.secret.slice(-4));
          assignments.push(
            `secret_ciphertext = $${values.length - 1}`,
            `secret_hint = $${values.length}`,
          );
        }
        values.push(id, data.expectedVersion);
        const result = await client.query(
          `UPDATE integrations
           SET ${assignments.join(", ")}, version = version + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${values.length - 1} AND version = $${values.length}
           RETURNING id, tenant_id, name, type, endpoint_url, status, secret_hint,
                     (secret_ciphertext IS NOT NULL) AS has_secret,
                     last_checked_at, version, created_at, updated_at`,
          values,
        );
        if (result.rowCount === 0) {
          const existing = await client.query("SELECT version FROM integrations WHERE id = $1", [id]);
          if (existing.rowCount > 0) portalFail(409, "VERSION_CONFLICT", "Tích hợp đã thay đổi; hãy tải lại.");
          portalFail(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tích hợp.");
        }
        const row = serializeDatabaseRow(result.rows[0]);
        await appendAudit(client, {
          actor,
          context,
          action: "integrations.update",
          resource: "integrations",
          resourceId: id,
          tenantId: row.tenantId,
          metadata: {
            fields: [...entries.map(([key]) => key), ...(data.secret ? ["secret"] : [])],
            previousVersion: data.expectedVersion,
          },
        });
        return row;
      });
    },

    async listTicketComments({ actor, id, scope }) {
      return withDatabaseScope(database, scope, async (client) => {
        const ticket = await client.query("SELECT id FROM tickets WHERE id = $1", [id]);
        if (ticket.rowCount === 0) portalFail(404, "TICKET_NOT_FOUND", "Không tìm thấy ticket.");
        const result = await client.query(
          `SELECT id, ticket_id, author_name, visibility, body, created_at
           FROM ticket_comments
           WHERE ticket_id = $1
             ${actor.authorization.workspace === "client" ? "AND visibility = 'CUSTOMER'" : ""}
           ORDER BY created_at ASC, id ASC`,
          [id],
        );
        return result.rows.map(serializeDatabaseRow);
      });
    },

    async createTicketComment({ actor, context, data, id, scope }) {
      const commentId = randomUUID();
      return withDatabaseScope(database, scope, async (client) => {
        const ticket = await client.query(
          "SELECT tenant_id FROM tickets WHERE id = $1 FOR UPDATE",
          [id],
        );
        if (ticket.rowCount === 0) portalFail(404, "TICKET_NOT_FOUND", "Không tìm thấy ticket.");
        const result = await client.query(
          `INSERT INTO ticket_comments (
             id, tenant_id, ticket_id, author_issuer, author_subject,
             author_name, visibility, body
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, ticket_id, author_name, visibility, body, created_at`,
          [
            commentId,
            ticket.rows[0].tenant_id,
            id,
            actor.identity.issuer,
            actor.identity.subject,
            actor.user.displayName,
            data.visibility,
            data.body,
          ],
        );
        if (actor.authorization.workspace === "internal") {
          await client.query(
            `UPDATE tickets
             SET first_response_at = COALESCE(first_response_at, CURRENT_TIMESTAMP),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id],
          );
        }
        await appendAudit(client, {
          actor,
          context,
          action: "tickets.comment",
          resource: "tickets",
          resourceId: id,
          tenantId: ticket.rows[0].tenant_id,
          metadata: { visibility: data.visibility },
        });
        return serializeDatabaseRow(result.rows[0]);
      });
    },

    async listMembers({ scope, query }) {
      return withDatabaseScope(database, scope, async (client) => {
        const parameters = [];
        const clauses = [];
        if (scope.tenantId) {
          parameters.push(scope.tenantId);
          clauses.push(`m.tenant_id = $${parameters.length}`);
        }
        if (query.filters.role) {
          parameters.push(query.filters.role);
          clauses.push(`m.role = $${parameters.length}`);
        }
        if (query.filters.status) {
          parameters.push(query.filters.status);
          clauses.push(`m.status = $${parameters.length}`);
        }
        if (query.search) {
          parameters.push(`%${query.search}%`);
          clauses.push(`(m.email ILIKE $${parameters.length} OR m.display_name ILIKE $${parameters.length})`);
        }
        const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
        const count = await client.query(`SELECT count(*)::int AS total FROM memberships m ${where}`, parameters);
        const offset = (query.page - 1) * query.pageSize;
        const values = [...parameters, query.pageSize, offset];
        const result = await client.query(
          `SELECT m.id, m.tenant_id, t.name AS tenant_name, m.email, m.display_name,
                  m.role, m.workspace, m.status, m.last_login_at, m.version, m.created_at
           FROM memberships m
           JOIN tenants t ON t.id = m.tenant_id
           ${where}
           ORDER BY m.created_at DESC, m.id
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const totalItems = count.rows[0].total;
        return {
          data: result.rows.map(serializeDatabaseRow),
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / query.pageSize),
          },
        };
      });
    },

    async updateMember({ actor, context, data, id, scope, workspaceForRole }) {
      return withDatabaseScope(database, scope, async (client) => {
        const existing = await client.query(
          `SELECT id, issuer, subject, tenant_id, role, workspace, status, version
           FROM memberships WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (existing.rowCount === 0) portalFail(404, "MEMBER_NOT_FOUND", "Không tìm thấy thành viên.");
        const member = existing.rows[0];
        if (
          member.issuer === actor.identity.issuer &&
          member.subject === actor.identity.subject &&
          (data.status === "DISABLED" || (data.role && data.role !== member.role))
        ) {
          portalFail(409, "SELF_LOCKOUT_DENIED", "Không thể tự vô hiệu hóa hoặc đổi role của chính mình.");
        }
        if (member.version !== data.expectedVersion) {
          portalFail(409, "VERSION_CONFLICT", "Thành viên đã thay đổi; hãy tải lại.");
        }
        const role = data.role ?? member.role;
        const status = data.status ?? member.status;
        const result = await client.query(
          `UPDATE memberships
           SET role = $2, workspace = $3, status = $4,
               version = version + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND version = $5
           RETURNING id, tenant_id, email, display_name, role, workspace,
                     status, last_login_at, version, created_at`,
          [id, role, workspaceForRole(role), status, data.expectedVersion],
        );
        if (data.role || data.status === "DISABLED") {
          await client.query(
            `DELETE FROM auth_records
             WHERE store_name = 'session'
               AND value->'identity'->>'issuer' = $1
               AND value->'identity'->>'subject' = $2`,
            [member.issuer, member.subject],
          );
        }
        await appendAudit(client, {
          actor,
          context,
          action: "members.update",
          resource: "members",
          resourceId: id,
          tenantId: member.tenant_id,
          metadata: { fields: Object.keys(data).filter((key) => key !== "expectedVersion") },
        });
        return serializeDatabaseRow(result.rows[0]);
      });
    },

    async listInvitations({ scope, query }) {
      return withDatabaseScope(database, scope, async (client) => {
        const parameters = [];
        const clauses = [];
        if (scope.tenantId) {
          parameters.push(scope.tenantId);
          clauses.push(`i.tenant_id = $${parameters.length}`);
        }
        if (query.filters.status) {
          parameters.push(query.filters.status);
          clauses.push(`i.status = $${parameters.length}`);
        }
        const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
        const count = await client.query(`SELECT count(*)::int AS total FROM invitations i ${where}`, parameters);
        const offset = (query.page - 1) * query.pageSize;
        const values = [...parameters, query.pageSize, offset];
        const result = await client.query(
          `SELECT i.id, i.tenant_id, t.name AS tenant_name, i.email, i.role,
                  i.status, i.expires_at, i.created_at, i.accepted_at
           FROM invitations i
           JOIN tenants t ON t.id = i.tenant_id
           ${where}
           ORDER BY i.created_at DESC, i.id
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const totalItems = count.rows[0].total;
        return {
          data: result.rows.map(serializeDatabaseRow),
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / query.pageSize),
          },
        };
      });
    },

    async listAudit({ actor, scope, query }) {
      return withDatabaseScope(database, scope, async (client) => {
        const parameters = [];
        const clauses = [];
        if (scope.tenantId) {
          parameters.push(scope.tenantId);
          clauses.push(`a.tenant_id = $${parameters.length}`);
        }
        for (const [key, column] of Object.entries({
          action: "action",
          outcome: "outcome",
          resourceType: "resource_type",
        })) {
          if (!query.filters[key]) continue;
          parameters.push(query.filters[key]);
          clauses.push(`a.${column} = $${parameters.length}`);
        }
        if (query.search) {
          parameters.push(`%${query.search}%`);
          clauses.push(`(a.action ILIKE $${parameters.length} OR a.resource_id ILIKE $${parameters.length})`);
        }
        const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
        const count = await client.query(`SELECT count(*)::int AS total FROM audit_events a ${where}`, parameters);
        const offset = (query.page - 1) * query.pageSize;
        const values = [...parameters, query.pageSize, offset];
        const identityColumns = actor.authorization.workspace === "internal"
          ? "a.actor_issuer, a.actor_subject,"
          : "";
        const result = await client.query(
          `SELECT a.id, a.tenant_id, ${identityColumns} a.actor_role, a.action,
                  a.resource_type, a.resource_id, a.outcome, a.request_id,
                  a.metadata, a.created_at
           FROM audit_events a
           ${where}
           ORDER BY a.created_at DESC, a.id DESC
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const totalItems = count.rows[0].total;
        return {
          data: result.rows.map(serializeDatabaseRow),
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / query.pageSize),
          },
        };
      });
    },

    async updateResource({ actor, context, data, id, resource, scope }) {
      const definition = definitionFor(resource);
      const expectedVersion = data.expectedVersion;
      const entries = Object.entries(definition.updateFields ?? {})
        .filter(([key]) => data[key] !== undefined);
      return withDatabaseScope(database, scope, async (client) => {
        const values = entries.map(([key]) => data[key]);
        const assignments = entries.map(([, column], index) => `${column} = $${index + 1}`);
        if (resource === "tickets" && data.status) {
          const statusIndex = entries.findIndex(([key]) => key === "status") + 1;
          assignments.push(
            `first_response_at = CASE
               WHEN $${statusIndex} IN ('ACKNOWLEDGED', 'IN_PROGRESS')
               THEN COALESCE(first_response_at, CURRENT_TIMESTAMP)
               ELSE first_response_at END`,
            `resolved_at = CASE
               WHEN $${statusIndex} IN ('RESOLVED', 'CLOSED')
               THEN COALESCE(resolved_at, CURRENT_TIMESTAMP)
               ELSE NULL END`,
          );
        }
        if (resource === "alerts" && data.status) {
          const statusIndex = entries.findIndex(([key]) => key === "status") + 1;
          assignments.push(
            `acknowledged_at = CASE
               WHEN $${statusIndex} = 'ACKNOWLEDGED'
               THEN COALESCE(acknowledged_at, CURRENT_TIMESTAMP)
               ELSE acknowledged_at END`,
            `resolved_at = CASE
               WHEN $${statusIndex} = 'RESOLVED'
               THEN COALESCE(resolved_at, CURRENT_TIMESTAMP)
               ELSE NULL END`,
          );
        }
        if (resource === "knowledge" && data.status) {
          const statusIndex = entries.findIndex(([key]) => key === "status") + 1;
          assignments.push(
            `published_at = CASE
               WHEN $${statusIndex} = 'PUBLISHED'
               THEN COALESCE(published_at, CURRENT_TIMESTAMP)
               ELSE published_at END`,
          );
        }
        if (resource === "invoices" && data.status) {
          const statusIndex = entries.findIndex(([key]) => key === "status") + 1;
          assignments.push(
            `paid_at = CASE
               WHEN $${statusIndex} = 'PAID'
               THEN COALESCE(paid_at, CURRENT_TIMESTAMP)
               ELSE paid_at END`,
          );
        }
        values.push(id, expectedVersion);
        const result = await client.query(
          `UPDATE ${definition.table}
           SET ${assignments.join(", ")},
               version = version + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $${values.length - 1} AND version = $${values.length}
           RETURNING ${definition.columns.join(", ")}`,
          values,
        );
        if (result.rowCount === 0) {
          const existing = await client.query(
            `SELECT version FROM ${definition.table} WHERE id = $1`,
            [id],
          );
          if (existing.rowCount > 0) {
            portalFail(409, "VERSION_CONFLICT", "Tài nguyên đã thay đổi; hãy tải lại trước khi cập nhật.");
          }
          portalFail(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tài nguyên.");
        }
        const row = serializeDatabaseRow(result.rows[0]);
        await appendAudit(client, {
          actor,
          context,
          action: `${resource}.update`,
          resource,
          resourceId: id,
          tenantId: row.tenantId ?? row.id,
          metadata: { fields: entries.map(([key]) => key), previousVersion: expectedVersion },
        });
        return row;
      });
    },
  });
}

export { RESOURCE_DEFINITIONS };
