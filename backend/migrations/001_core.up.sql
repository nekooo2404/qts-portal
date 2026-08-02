CREATE TABLE tenants (
  id VARCHAR(64) PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  name VARCHAR(180) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  service_tier VARCHAR(80),
  emergency_contact_name VARCHAR(160),
  emergency_contact_email VARCHAR(320),
  emergency_contact_phone VARCHAR(40),
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memberships (
  issuer TEXT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  role VARCHAR(40) NOT NULL CHECK (role IN (
    'client_admin', 'client_viewer', 'billing', 'technical',
    'soc_l1', 'soc_l2', 'soc_l3', 'account_manager', 'qts_admin'
  )),
  workspace VARCHAR(16) NOT NULL CHECK (workspace IN ('client', 'internal')),
  email VARCHAR(320),
  display_name VARCHAR(180),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issuer, subject),
  CHECK (
    (workspace = 'client' AND role IN ('client_admin', 'client_viewer', 'billing', 'technical')) OR
    (workspace = 'internal' AND role IN ('soc_l1', 'soc_l2', 'soc_l3', 'account_manager', 'qts_admin'))
  )
);

CREATE INDEX memberships_tenant_idx ON memberships (tenant_id, status);

CREATE TABLE invitations (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  email VARCHAR(320) NOT NULL,
  role VARCHAR(40) NOT NULL CHECK (role IN ('client_admin', 'client_viewer', 'billing', 'technical')),
  workspace VARCHAR(16) NOT NULL DEFAULT 'client' CHECK (workspace = 'client'),
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_issuer TEXT NOT NULL,
  created_by_subject VARCHAR(255) NOT NULL,
  accepted_issuer TEXT,
  accepted_subject VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX invitations_pending_email_idx
  ON invitations (tenant_id, lower(email)) WHERE status = 'PENDING';

CREATE TABLE auth_records (
  store_name VARCHAR(32) NOT NULL CHECK (store_name IN ('transaction', 'session')),
  key_hash CHAR(64) NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_name, key_hash)
);

CREATE INDEX auth_records_expiry_idx ON auth_records (expires_at);

CREATE TABLE assets (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  name VARCHAR(180) NOT NULL,
  type VARCHAR(40) NOT NULL CHECK (type IN ('SERVER', 'ENDPOINT', 'NETWORK', 'CLOUD', 'APPLICATION', 'SECURITY_DEVICE', 'OTHER')),
  vendor VARCHAR(120),
  identifier VARCHAR(255),
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'RETIRED')),
  criticality VARCHAR(16) NOT NULL DEFAULT 'MEDIUM' CHECK (criticality IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  health_status VARCHAR(24) NOT NULL DEFAULT 'UNKNOWN' CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN')),
  owner VARCHAR(180),
  last_seen_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, tenant_id)
);

CREATE UNIQUE INDEX assets_tenant_identifier_idx
  ON assets (tenant_id, identifier) WHERE identifier IS NOT NULL;
CREATE INDEX assets_tenant_status_idx ON assets (tenant_id, status, health_status);

CREATE TABLE licenses (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  product_name VARCHAR(180) NOT NULL,
  vendor VARCHAR(120),
  license_reference VARCHAR(160),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  used_quantity INTEGER NOT NULL DEFAULT 0 CHECK (used_quantity >= 0),
  starts_at DATE,
  expires_at DATE,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (used_quantity <= quantity)
);

CREATE INDEX licenses_tenant_expiry_idx ON licenses (tenant_id, expires_at, status);

CREATE TABLE alerts (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  external_ref VARCHAR(160),
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  source VARCHAR(100) NOT NULL,
  asset_id VARCHAR(36),
  detected_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, tenant_id),
  FOREIGN KEY (asset_id, tenant_id) REFERENCES assets(id, tenant_id)
);

CREATE UNIQUE INDEX alerts_tenant_external_ref_idx
  ON alerts (tenant_id, external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX alerts_tenant_detected_idx ON alerts (tenant_id, detected_at DESC);
CREATE INDEX alerts_open_severity_idx ON alerts (tenant_id, severity, status) WHERE status <> 'RESOLVED';

CREATE TABLE tickets (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  sequence_number BIGSERIAL NOT NULL UNIQUE,
  category VARCHAR(24) NOT NULL CHECK (category IN ('INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'BILLING')),
  subject VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED')),
  reporter_issuer TEXT NOT NULL,
  reporter_subject VARCHAR(255) NOT NULL,
  reporter_name VARCHAR(180) NOT NULL,
  assignee VARCHAR(255),
  sla_minutes INTEGER NOT NULL CHECK (sla_minutes > 0),
  due_at TIMESTAMPTZ NOT NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  idempotency_key VARCHAR(128) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX tickets_tenant_queue_idx ON tickets (tenant_id, status, severity, due_at);
CREATE INDEX tickets_created_idx ON tickets (created_at DESC);

CREATE TABLE ticket_comments (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  ticket_id VARCHAR(36) NOT NULL,
  author_issuer TEXT NOT NULL,
  author_subject VARCHAR(255) NOT NULL,
  author_name VARCHAR(180) NOT NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'CUSTOMER' CHECK (visibility IN ('CUSTOMER', 'INTERNAL')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id, tenant_id) REFERENCES tickets(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX ticket_comments_ticket_idx ON ticket_comments (tenant_id, ticket_id, created_at);

CREATE TABLE contracts (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  contract_number VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  starts_at DATE NOT NULL,
  expires_at DATE,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  total_amount NUMERIC(18, 2),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, contract_number)
);

CREATE INDEX contracts_tenant_status_idx ON contracts (tenant_id, status, expires_at);

CREATE TABLE invoices (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  contract_id VARCHAR(36),
  invoice_number VARCHAR(80) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  status VARCHAR(24) NOT NULL CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID')),
  issued_at DATE,
  due_at DATE,
  paid_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, invoice_number),
  FOREIGN KEY (contract_id, tenant_id) REFERENCES contracts(id, tenant_id)
);

CREATE INDEX invoices_tenant_status_idx ON invoices (tenant_id, status, due_at);

CREATE TABLE documents (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  type VARCHAR(24) NOT NULL CHECK (type IN ('SECURITY_REPORT', 'COMPLIANCE_REPORT', 'INVOICE_ATTACHMENT', 'OTHER')),
  title VARCHAR(180) NOT NULL,
  description TEXT,
  filename VARCHAR(255) NOT NULL,
  media_type VARCHAR(100) NOT NULL CHECK (media_type IN ('application/pdf', 'text/plain', 'text/markdown')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  content_sha256 CHAR(64) NOT NULL,
  content BYTEA NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_issuer TEXT NOT NULL,
  created_by_subject VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX documents_tenant_published_idx ON documents (tenant_id, published_at DESC);

CREATE TABLE knowledge_articles (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) REFERENCES tenants(id),
  title VARCHAR(180) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  audience VARCHAR(16) NOT NULL DEFAULT 'CLIENT' CHECK (audience IN ('CLIENT', 'INTERNAL', 'ALL')),
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX knowledge_articles_audience_idx
  ON knowledge_articles (tenant_id, audience, status, published_at DESC);

CREATE TABLE integrations (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  name VARCHAR(160) NOT NULL,
  type VARCHAR(24) NOT NULL CHECK (type IN ('SIEM', 'SOAR', 'EDR', 'WEBHOOK', 'OTHER')),
  endpoint_url TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'CONFIGURED' CHECK (status IN ('CONFIGURED', 'ACTIVE', 'DEGRADED', 'DISABLED')),
  secret_ciphertext TEXT,
  secret_hint VARCHAR(16),
  last_checked_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX integrations_tenant_status_idx ON integrations (tenant_id, status, type);

CREATE TABLE soc_shifts (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
  engineer_name VARCHAR(180) NOT NULL,
  level VARCHAR(16) NOT NULL CHECK (level IN ('L1', 'L2', 'L3', 'MANAGER')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  handover_notes TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at > starts_at)
);

CREATE INDEX soc_shifts_schedule_idx ON soc_shifts (tenant_id, starts_at, ends_at, status);

CREATE TABLE audit_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(64) REFERENCES tenants(id),
  actor_issuer TEXT,
  actor_subject VARCHAR(255),
  actor_role VARCHAR(40),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(80),
  resource_id VARCHAR(80),
  outcome VARCHAR(16) NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILURE')),
  request_id VARCHAR(64),
  ip_address INET,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_events_tenant_created_idx ON audit_events (tenant_id, created_at DESC);
CREATE INDEX audit_events_actor_created_idx ON audit_events (actor_issuer, actor_subject, created_at DESC);

CREATE FUNCTION qts_reject_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION qts_reject_audit_mutation();

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING (
    current_setting('qts.internal_access', true) = 'true' OR
    id = current_setting('qts.tenant_id', true)
  )
  WITH CHECK (
    current_setting('qts.internal_access', true) = 'true' OR
    id = current_setting('qts.tenant_id', true)
  );

DO $$
DECLARE
  protected_table TEXT;
BEGIN
  FOREACH protected_table IN ARRAY ARRAY[
    'memberships', 'invitations', 'assets', 'licenses', 'alerts', 'tickets',
    'ticket_comments', 'contracts', 'invoices', 'documents', 'knowledge_articles',
    'integrations', 'soc_shifts', 'audit_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', protected_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', protected_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (' ||
      'current_setting(''qts.internal_access'', true) = ''true'' OR ' ||
      'tenant_id = current_setting(''qts.tenant_id'', true)' ||
      ') WITH CHECK (' ||
      'current_setting(''qts.internal_access'', true) = ''true'' OR ' ||
      'tenant_id = current_setting(''qts.tenant_id'', true)' ||
      ')',
      protected_table
    );
  END LOOP;
END;
$$;
