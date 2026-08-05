ALTER TABLE contact_requests
  ADD COLUMN name VARCHAR(160),
  ADD COLUMN phone VARCHAR(32),
  ADD COLUMN company VARCHAR(160);

UPDATE contact_requests
SET
  name = 'Khách hàng chưa xác định',
  phone = 'Chưa cung cấp',
  company = 'Doanh nghiệp chưa xác định'
WHERE name IS NULL OR phone IS NULL OR company IS NULL;

ALTER TABLE contact_requests
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL,
  ALTER COLUMN company SET NOT NULL;

ALTER TABLE contact_requests DROP CONSTRAINT contact_requests_service_check;

UPDATE contact_requests
SET service = CASE
  WHEN service = 'architecture' THEN 'software-development'
  ELSE 'it-solutions'
END;

ALTER TABLE contact_requests
  ADD CONSTRAINT contact_requests_service_check CHECK (service IN (
    'website-design', 'software-development', 'digital-transformation',
    'online-advertising', 'digital-marketing', 'it-solutions'
  ));
