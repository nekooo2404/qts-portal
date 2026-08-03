import { AlertTriangle, Building2, ChevronRight, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { PortalSession } from '../../auth/types';
import { navigationFor } from '../../portal/navigation';
import type { TenantOption } from '../../portal/types';
import { PortalLink } from './PortalLink';

export default function PortalShell({
  children,
  path,
  selectedTenantId,
  session,
  setSelectedTenantId,
  tenants,
  tenantLoadError,
  onLogout,
}: {
  children: ReactNode;
  path: string;
  selectedTenantId?: string;
  session: PortalSession;
  setSelectedTenantId: (value?: string) => void;
  tenants: TenantOption[];
  tenantLoadError?: string;
  onLogout: () => Promise<void>;
}) {
  const [railOpen, setRailOpen] = useState(false);
  const navigation = navigationFor(session);
  const current = navigation.find((item) => item.path === path) ?? navigation[0];
  const isInternal = session.authorization.workspace === 'internal';

  return (
    <div className="portal-app" data-portal="true">
      <a className="portal-skip-link" href="#portal-main">Bỏ qua điều hướng</a>
      <aside className="portal-rail" data-open={railOpen}>
        <div className="portal-rail__brand">
          <PortalLink to={isInternal ? '/admin/soc' : '/client/overview'}>
            <img alt="Logo khiên QTS" height="40" src="/qts-logo-160.webp" width="40" />
            <span><strong>QTS</strong><small>{isInternal ? 'Internal Portal' : 'Client Portal'}</small></span>
          </PortalLink>
          <button className="portal-icon-button portal-rail__close" onClick={() => setRailOpen(false)} title="Đóng menu" type="button"><X aria-hidden="true" /><span className="sr-only">Đóng menu</span></button>
        </div>
        <div className="portal-rail__scope"><span>Phạm vi hiện tại</span><strong>{isInternal ? (selectedTenantId ? tenants.find((tenant) => tenant.id === selectedTenantId)?.name ?? selectedTenantId : 'Tất cả khách hàng') : session.authorization.tenantId}</strong><span className="portal-status" data-tone="healthy"><span className="portal-status__mark" />Session hợp lệ</span></div>
        <nav aria-label="Điều hướng portal">
          <p className="portal-rail__label">Vận hành</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return <PortalLink className="portal-rail__link" data-active={path === item.path} key={item.path} onClick={() => setRailOpen(false)} to={item.path}><Icon aria-hidden={true} /><span>{item.label}</span><ChevronRight aria-hidden="true" /></PortalLink>;
          })}
        </nav>
        <footer className="portal-rail__footer">
          <PortalLink className="portal-rail__company" to="/company"><Building2 aria-hidden="true" /><span>Trang công ty QTS</span></PortalLink>
          <button className="portal-rail__logout" onClick={() => void onLogout()} type="button"><LogOut aria-hidden="true" /><span>Đăng xuất</span></button>
        </footer>
      </aside>
      {railOpen && <button aria-label="Đóng menu" className="portal-rail-scrim" onClick={() => setRailOpen(false)} type="button" />}

      <section className="portal-workspace">
        <header className="portal-topbar">
          <div className="portal-topbar__route">
            <button className="portal-icon-button portal-menu-button" onClick={() => setRailOpen(true)} title="Mở menu" type="button"><Menu aria-hidden="true" /><span className="sr-only">Mở menu</span></button>
            <span>{isInternal ? 'Internal Portal' : 'Client Portal'}</span><ChevronRight aria-hidden="true" /><strong>{current?.label ?? 'Workspace'}</strong>
          </div>
          <div className="portal-topbar__actions">
            {isInternal && (
              <label className="portal-scope-select">
                <span className="sr-only">Chọn tenant</span>
                <select aria-invalid={Boolean(tenantLoadError)} onChange={(event) => setSelectedTenantId(event.target.value || undefined)} value={selectedTenantId ?? ''}>
                  <option value="">Tất cả khách hàng</option>
                  {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </label>
            )}
            {tenantLoadError ? <span className="portal-status" data-tone="critical"><AlertTriangle aria-hidden="true" />Không tải được tenant</span> : <span className="portal-status" data-tone="healthy"><ShieldCheck aria-hidden="true" />API bảo vệ</span>}
            <div className="portal-profile"><ShieldCheck aria-hidden="true" /><span><strong>{session.user.displayName}</strong><small>{session.authorization.role}</small></span></div>
          </div>
        </header>
        {children}
        <footer className="portal-status-line"><ShieldCheck aria-hidden="true" />QTS Portal · Google OIDC · Tenant RBAC · Audit enabled</footer>
      </section>
    </div>
  );
}
