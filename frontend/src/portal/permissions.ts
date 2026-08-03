import type { PortalRole } from '../auth/types';
import type { PortalResource } from './types';

type PortalPermission =
  | 'alerts.write'
  | 'tickets.create'
  | 'tickets.manage'
  | 'assets.write'
  | 'billing.write'
  | 'documents.write'
  | 'knowledge.write'
  | 'integrations.write'
  | 'members.write'
  | 'shifts.write'
  | 'tenants.write';

const ROLE_PERMISSIONS: Record<PortalRole, ReadonlySet<PortalPermission>> = {
  client_viewer: new Set(),
  technical: new Set(['tickets.create']),
  billing: new Set(['tickets.create']),
  client_admin: new Set(['tickets.create', 'members.write']),
  soc_l1: new Set(['alerts.write', 'tickets.create', 'tickets.manage']),
  soc_l2: new Set([
    'alerts.write', 'tickets.create', 'tickets.manage', 'assets.write',
    'documents.write', 'shifts.write',
  ]),
  soc_l3: new Set([
    'alerts.write', 'tickets.create', 'tickets.manage', 'assets.write',
    'documents.write', 'knowledge.write', 'shifts.write',
  ]),
  account_manager: new Set([
    'tenants.write', 'tickets.create', 'tickets.manage', 'assets.write',
    'billing.write', 'documents.write', 'knowledge.write',
  ]),
  qts_admin: new Set([
    'alerts.write', 'tickets.create', 'tickets.manage', 'assets.write',
    'billing.write', 'documents.write', 'knowledge.write',
    'integrations.write', 'members.write', 'shifts.write', 'tenants.write',
  ]),
};

const RESOURCE_WRITE_PERMISSION: Partial<Record<PortalResource, PortalPermission>> = {
  alerts: 'alerts.write',
  tickets: 'tickets.create',
  assets: 'assets.write',
  licenses: 'assets.write',
  tenants: 'tenants.write',
  contracts: 'billing.write',
  invoices: 'billing.write',
  documents: 'documents.write',
  knowledge: 'knowledge.write',
  integrations: 'integrations.write',
  shifts: 'shifts.write',
};

export function hasPortalPermission(role: PortalRole, permission: PortalPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function canWriteResource(role: PortalRole, resource: PortalResource): boolean {
  const permission = RESOURCE_WRITE_PERMISSION[resource];
  return permission ? hasPortalPermission(role, permission) : false;
}
