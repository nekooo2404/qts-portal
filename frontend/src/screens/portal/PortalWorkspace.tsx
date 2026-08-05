import { ShieldX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { PortalSession } from '../../auth/types';
import PortalShell from '../../components/portal/PortalShell';
import { hasPortalPermission, canWriteResource } from '../../portal/permissions';
import { navigationFor } from '../../portal/navigation';
import { RESOURCE_DEFINITIONS } from '../../portal/resource-config';
import { listResource } from '../../portal/api';
import type { TenantOption } from '../../portal/types';
import AuditPage from './AuditPage';
import DocumentsPage from './DocumentsPage';
import OverviewPage from './OverviewPage';
import ResourcePage from './ResourcePage';
import TeamPage from './TeamPage';
import TicketsPage from './TicketsPage';

function AccessDenied() {
  return (
    <main className="portal-main" id="portal-main"><div className="portal-page"><div className="portal-state" role="alert"><ShieldX aria-hidden="true" /><strong>Không có quyền truy cập chức năng</strong><p>Role trong session hiện tại không có quyền đọc module này.</p></div></div></main>
  );
}

export default function PortalWorkspace({
  logout,
  path,
  session,
}: {
  logout: () => Promise<void>;
  path: string;
  session: PortalSession;
}) {
  const isInternal = session.authorization.workspace === 'internal';
  const [selectedTenantId, setSelectedTenantId] = useState<string>();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantLoadError, setTenantLoadError] = useState<string>();
  const normalizedPath = path.length > 1 ? path.replace(/\/+$/u, '') : path;
  const canonicalPath = normalizedPath === '/portal'
    ? '/portal/overview'
    : normalizedPath === '/admin'
      ? '/admin/soc'
      : normalizedPath;
  const allowedPaths = useMemo(() => new Set(navigationFor(session).map((item) => item.path)), [session]);

  useEffect(() => {
    if (!isInternal) return;
    const controller = new AbortController();
    let active = true;
    void listResource('tenants', { pageSize: 100, signal: controller.signal }).then(
      (response) => {
        if (!active) return;
        setTenants(response.data.map((tenant) => ({ id: tenant.id, name: typeof tenant.name === 'string' ? tenant.name : tenant.id })));
        setTenantLoadError(undefined);
      },
      (error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setTenantLoadError(error instanceof Error ? error.message : 'Không thể tải tenant.');
      },
    );
    return () => { active = false; controller.abort(); };
  }, [isInternal]);

  if (!allowedPaths.has(canonicalPath)) {
    return <PortalShell onLogout={logout} path={canonicalPath} selectedTenantId={selectedTenantId} session={session} setSelectedTenantId={setSelectedTenantId} tenantLoadError={tenantLoadError} tenants={tenants}><AccessDenied /></PortalShell>;
  }

  const common = { selectedTenantId, session, tenants };
  const pageKey = `${canonicalPath}:${selectedTenantId ?? (isInternal ? 'all-tenants' : session.authorization.tenantId)}`;
  let page;
  if (canonicalPath === '/portal/overview' || canonicalPath === '/admin/soc') {
    page = <OverviewPage key={pageKey} mode={isInternal ? 'internal' : 'client'} selectedTenantId={selectedTenantId} />;
  } else if (canonicalPath.endsWith('/tickets')) {
    page = <TicketsPage {...common} canCreate={hasPortalPermission(session.authorization.role, 'tickets.create')} canManage={hasPortalPermission(session.authorization.role, 'tickets.manage')} key={pageKey} />;
  } else if (canonicalPath.endsWith('/documents')) {
    page = <DocumentsPage {...common} canWrite={canWriteResource(session.authorization.role, 'documents')} key={pageKey} />;
  } else if (canonicalPath.endsWith('/team')) {
    page = <TeamPage {...common} canWrite={hasPortalPermission(session.authorization.role, 'members.write')} key={pageKey} />;
  } else if (canonicalPath.endsWith('/audit')) {
    page = <AuditPage key={pageKey} selectedTenantId={selectedTenantId} />;
  } else {
    const resourceByPath = {
      alerts: 'alerts', assets: 'assets', licenses: 'licenses', customers: 'tenants',
      contracts: 'contracts', invoices: 'invoices', knowledge: 'knowledge',
      integrations: 'integrations', shifts: 'shifts',
    } as const;
    const segment = canonicalPath.split('/').at(-1) as keyof typeof resourceByPath;
    const resource = resourceByPath[segment];
    page = resource ? (
      <ResourcePage
        {...common}
        canWrite={canWriteResource(session.authorization.role, resource)}
        definition={RESOURCE_DEFINITIONS[resource]}
        key={pageKey}
      />
    ) : <AccessDenied />;
  }

  return (
    <PortalShell
      onLogout={logout}
      path={canonicalPath}
      selectedTenantId={selectedTenantId}
      session={session}
      setSelectedTenantId={setSelectedTenantId}
      tenantLoadError={tenantLoadError}
      tenants={tenants}
    >
      {page}
    </PortalShell>
  );
}
