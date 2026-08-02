DROP POLICY tenant_isolation ON knowledge_articles;
CREATE POLICY tenant_isolation ON knowledge_articles
  USING (
    current_setting('qts.internal_access', true) = 'true' OR
    tenant_id = current_setting('qts.tenant_id', true)
  )
  WITH CHECK (
    current_setting('qts.internal_access', true) = 'true' OR
    tenant_id = current_setting('qts.tenant_id', true)
  );

ALTER TABLE tickets DROP COLUMN request_fingerprint;
UPDATE tickets
SET sla_minutes = 1440,
    due_at = created_at + INTERVAL '24 hours'
WHERE sla_minutes IS NULL OR due_at IS NULL;
ALTER TABLE tickets
  ALTER COLUMN sla_minutes SET NOT NULL,
  ALTER COLUMN due_at SET NOT NULL;

ALTER TABLE tenants
  DROP COLUMN sla_critical_minutes,
  DROP COLUMN sla_high_minutes,
  DROP COLUMN sla_medium_minutes,
  DROP COLUMN sla_low_minutes;
