import type { ServiceInterest } from '../marketing/content';

export type PortalResource =
  | 'alerts'
  | 'tickets'
  | 'assets'
  | 'licenses'
  | 'tenants'
  | 'contracts'
  | 'invoices'
  | 'documents'
  | 'knowledge'
  | 'integrations'
  | 'shifts';

export interface PortalRecord {
  id: string;
  tenantId?: string | null;
  tenantName?: string | null;
  version?: number;
  [key: string]: unknown;
}

export interface ContactRequestRecord extends PortalRecord {
  name: string;
  phone: string;
  email: string;
  company: string;
  service: ServiceInterest;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'ARCHIVED';
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CollectionResponse<T extends PortalRecord = PortalRecord> {
  data: T[];
  pagination: Pagination;
}

export interface OverviewMetrics {
  openAlerts: number;
  criticalAlerts: number;
  activeTickets: number;
  slaBreached: number;
  totalAssets: number;
  healthyAssets: number;
  expiringLicenses: number;
  unpaidInvoices: number;
}

export interface CountPoint {
  count: number;
  severity?: string;
  healthStatus?: string;
}

export interface ThreatPoint {
  day: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface PortalOverview {
  scope: {
    kind: 'TENANT' | 'ALL_TENANTS';
    id?: string;
    name?: string;
    status?: string;
    serviceTier?: string | null;
    tenantCount?: number;
  };
  metrics: OverviewMetrics;
  severityBreakdown: CountPoint[];
  assetHealth: CountPoint[];
  threatSeries: ThreatPoint[];
  recentAlerts: PortalRecord[];
  recentTickets: PortalRecord[];
  contactRequests?: ContactRequestRecord[];
  generatedAt: string;
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: Error };

export interface TenantOption {
  id: string;
  name: string;
}
