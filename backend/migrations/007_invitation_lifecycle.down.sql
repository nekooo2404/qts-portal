DROP INDEX IF EXISTS invitations_status_expiry_idx;

ALTER TABLE invitations
  DROP COLUMN revoked_by_subject,
  DROP COLUMN revoked_by_issuer,
  DROP COLUMN revoked_at,
  DROP COLUMN updated_at,
  DROP COLUMN version;
