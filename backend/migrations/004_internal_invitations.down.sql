DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM invitations WHERE workspace = 'internal') THEN
    RAISE EXCEPTION 'Cannot roll back internal invitations while internal invitation rows exist';
  END IF;
END $$;

ALTER TABLE invitations
  DROP CONSTRAINT invitations_role_workspace_check,
  DROP CONSTRAINT invitations_workspace_check,
  DROP CONSTRAINT invitations_role_check;

ALTER TABLE invitations
  ADD CONSTRAINT invitations_role_check CHECK (role IN ('client_admin', 'client_viewer', 'billing', 'technical')),
  ADD CONSTRAINT invitations_workspace_check CHECK (workspace = 'client');
