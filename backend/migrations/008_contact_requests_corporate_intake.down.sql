ALTER TABLE contact_requests DROP CONSTRAINT contact_requests_service_check;

UPDATE contact_requests
SET service = CASE
  WHEN service = 'it-solutions' THEN 'identity-cloud'
  ELSE 'architecture'
END;

ALTER TABLE contact_requests
  ADD CONSTRAINT contact_requests_service_check CHECK (service IN (
    'assessment', 'pentest', 'vulnerability', 'identity-cloud',
    'incident-response', 'architecture'
  ));

ALTER TABLE contact_requests
  DROP COLUMN company,
  DROP COLUMN phone,
  DROP COLUMN name;
