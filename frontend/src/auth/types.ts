export type Workspace = 'client' | 'internal';

export type PortalRole =
  | 'client_admin'
  | 'client_viewer'
  | 'billing'
  | 'technical'
  | 'soc_l1'
  | 'soc_l2'
  | 'soc_l3'
  | 'account_manager'
  | 'qts_admin';

export interface PortalSession {
  user: {
    email: string;
    displayName: string;
  };
  authorization: {
    tenantId: string;
    role: PortalRole;
    workspace: Workspace;
  };
  csrfToken: string;
  expiresAt: string;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; session: PortalSession }
  | { status: 'error' };
