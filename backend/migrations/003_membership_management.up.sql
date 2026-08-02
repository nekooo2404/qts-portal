ALTER TABLE memberships
  ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

ALTER TABLE memberships ADD CONSTRAINT memberships_id_unique UNIQUE (id);
