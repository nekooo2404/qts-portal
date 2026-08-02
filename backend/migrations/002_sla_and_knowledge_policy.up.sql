ALTER TABLE tenants
  ADD COLUMN sla_critical_minutes INTEGER CHECK (sla_critical_minutes > 0),
  ADD COLUMN sla_high_minutes INTEGER CHECK (sla_high_minutes > 0),
  ADD COLUMN sla_medium_minutes INTEGER CHECK (sla_medium_minutes > 0),
  ADD COLUMN sla_low_minutes INTEGER CHECK (sla_low_minutes > 0);

ALTER TABLE tickets
  ALTER COLUMN sla_minutes DROP NOT NULL,
  ALTER COLUMN due_at DROP NOT NULL,
  ADD COLUMN request_fingerprint CHAR(64);

UPDATE tickets
SET request_fingerprint = repeat('0', 64)
WHERE request_fingerprint IS NULL;

ALTER TABLE tickets
  ALTER COLUMN request_fingerprint SET NOT NULL;

DROP POLICY tenant_isolation ON knowledge_articles;
CREATE POLICY tenant_isolation ON knowledge_articles
  USING (
    current_setting('qts.internal_access', true) = 'true' OR
    tenant_id IS NULL OR
    tenant_id = current_setting('qts.tenant_id', true)
  )
  WITH CHECK (
    current_setting('qts.internal_access', true) = 'true' OR
    tenant_id = current_setting('qts.tenant_id', true)
  );
