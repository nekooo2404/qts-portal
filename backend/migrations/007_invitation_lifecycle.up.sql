ALTER TABLE invitations
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN revoked_at TIMESTAMPTZ,
  ADD COLUMN revoked_by_issuer TEXT,
  ADD COLUMN revoked_by_subject VARCHAR(255);

CREATE INDEX invitations_status_expiry_idx
  ON invitations (tenant_id, status, expires_at);
