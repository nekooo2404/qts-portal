CREATE TABLE contact_requests (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  service VARCHAR(40) NOT NULL CHECK (service IN (
    'assessment', 'pentest', 'vulnerability', 'identity-cloud',
    'incident-response', 'architecture'
  )),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 20 AND 1200),
  consent BOOLEAN NOT NULL CHECK (consent),
  status VARCHAR(16) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'ARCHIVED')),
  request_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX contact_requests_status_created_idx
  ON contact_requests (status, created_at DESC);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY contact_requests_internal_only ON contact_requests
  USING (current_setting('qts.internal_access', true) = 'true')
  WITH CHECK (current_setting('qts.internal_access', true) = 'true');

GRANT SELECT, INSERT, UPDATE, DELETE ON contact_requests TO qts_app;
