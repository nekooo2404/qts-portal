ALTER TABLE invitations
  DROP CONSTRAINT invitations_role_check,
  DROP CONSTRAINT invitations_workspace_check;

ALTER TABLE invitations
  ADD CONSTRAINT invitations_role_check CHECK (role IN (
    'client_admin', 'client_viewer', 'billing', 'technical',
    'soc_l1', 'soc_l2', 'soc_l3', 'account_manager', 'qts_admin'
  )),
  ADD CONSTRAINT invitations_workspace_check CHECK (workspace IN ('client', 'internal')),
  ADD CONSTRAINT invitations_role_workspace_check CHECK (
    (workspace = 'client' AND role IN ('client_admin', 'client_viewer', 'billing', 'technical')) OR
    (workspace = 'internal' AND role IN ('soc_l1', 'soc_l2', 'soc_l3', 'account_manager', 'qts_admin'))
  );
