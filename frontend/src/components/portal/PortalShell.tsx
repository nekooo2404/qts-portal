import {
  AlertTriangle,
  Building2,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import type { PortalSession } from '../../auth/types';
import { navigationFor } from '../../portal/navigation';
import { WORKSPACE_BRAND, SITE_NAME } from '../../portal/brand';
import type { TenantOption } from '../../portal/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tooltip, TooltipProvider } from '../ui/Tooltip';
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
  const [railCollapsed, setRailCollapsed] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigation = navigationFor(session);
  const current = navigation.find((item) => item.path === path) ?? navigation[0];
  const isInternal = session.authorization.workspace === 'internal';
  const workspaceBrand = isInternal ? WORKSPACE_BRAND.internal : WORKSPACE_BRAND.client;
  const navigationGroups = Array.from(new Set(navigation.map((item) => item.section))).map(
    (section) => ({ section, items: navigation.filter((item) => item.section === section) }),
  );
  const initials = session.user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const closeRail = () => {
    setRailOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!railOpen) return undefined;

    const rail = railRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setRailOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }

      if (event.key !== 'Tab' || !rail) return;

      const focusable = Array.from(rail.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]):not([tabindex="-1"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        rail.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [railOpen]);

  return (
    <TooltipProvider delayDuration={180}>
    <div className="portal-app" data-portal="true" data-rail-collapsed={railCollapsed}>
      <a className="portal-skip-link" href="#portal-main">Bỏ qua điều hướng</a>
      <aside
        aria-label={railOpen ? 'Điều hướng portal' : undefined}
        aria-modal={railOpen || undefined}
        className="portal-rail"
        data-open={railOpen}
        id="portal-navigation"
        ref={railRef}
        role={railOpen ? 'dialog' : undefined}
        tabIndex={railOpen ? -1 : undefined}
      >
        <div className="portal-rail__brand">
          <PortalLink to={workspaceBrand.homePath}>
            <img alt="Logo khiên QTS" height="40" src="/qts-logo-160.webp" width="40" />
            <span><strong>{SITE_NAME}</strong><small>{workspaceBrand.label}</small></span>
          </PortalLink>
          <Tooltip content={railCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}>
            <Button className="portal-rail__collapse" onClick={() => setRailCollapsed((value) => !value)} size="icon" title={railCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} type="button">
              {railCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
              <span className="sr-only">{railCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}</span>
            </Button>
          </Tooltip>
          <Button className="portal-rail__close" onClick={closeRail} ref={closeButtonRef} size="icon" title="Đóng menu" type="button"><X aria-hidden="true" /><span className="sr-only">Đóng menu</span></Button>
        </div>
        <div className="portal-rail__scope"><span>Phạm vi hiện tại</span><strong>{isInternal ? (selectedTenantId ? tenants.find((tenant) => tenant.id === selectedTenantId)?.name ?? selectedTenantId : 'Tất cả khách hàng') : session.authorization.tenantId}</strong><Badge tone="healthy"><span className="portal-status__mark" />Session hợp lệ</Badge></div>
        <nav aria-label="Điều hướng portal">
          {navigationGroups.map((group) => (
            <div className="portal-rail__group" key={group.section}>
              <p className="portal-rail__label">{group.section}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Tooltip content={item.label} disabled={!railCollapsed} key={item.path}>
                    <PortalLink aria-label={railCollapsed ? item.label : undefined} className="portal-rail__link" data-active={path === item.path} onClick={closeRail} to={item.path}><Icon aria-hidden={true} /><span>{item.label}</span><ChevronRight aria-hidden="true" /></PortalLink>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>
        <footer className="portal-rail__footer">
          <PortalLink className="portal-rail__company" onClick={closeRail} to="/"><Building2 aria-hidden="true" /><span>Trang chủ QTS Việt Nam</span></PortalLink>
          <Button className="portal-rail__logout" onClick={() => void onLogout()} variant="ghost" type="button"><LogOut aria-hidden="true" /><span>Đăng xuất</span></Button>
        </footer>
      </aside>
      {railOpen && <button aria-hidden="true" className="portal-rail-scrim" onClick={closeRail} tabIndex={-1} type="button" />}

      <section className="portal-workspace">
        <header className="portal-topbar">
          <div className="portal-topbar__route">
            <Button aria-controls="portal-navigation" aria-expanded={railOpen} className="portal-menu-button" onClick={() => setRailOpen(true)} ref={menuButtonRef} size="icon" title="Mở menu" type="button"><Menu aria-hidden="true" /><span className="sr-only">Mở menu</span></Button>
            <strong>{current?.label ?? 'Workspace'}</strong>
          </div>
          <div className="portal-topbar__actions">
            {isInternal && (
              <label className="portal-scope-select">
                <span className="sr-only">Chọn tenant</span>
                <select aria-invalid={Boolean(tenantLoadError)} onChange={(event) => setSelectedTenantId(event.target.value || undefined)} value={selectedTenantId ?? ''}>
                  <option value="">Mọi tenant</option>
                  {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </label>
            )}
            {tenantLoadError ? <Badge tone="critical"><AlertTriangle aria-hidden="true" />Không tải được tenant</Badge> : <Badge tone="healthy"><ShieldCheck aria-hidden="true" />API bảo vệ</Badge>}
            <div className="portal-profile" title={`${session.user.displayName} · ${session.authorization.role}`}><span className="portal-profile__avatar" aria-hidden="true">{initials || 'Q'}</span><span><strong>{session.user.displayName}</strong><small>{session.authorization.role}</small></span></div>
          </div>
        </header>
        {children}
        <footer className="portal-status-line"><ShieldCheck aria-hidden="true" />{SITE_NAME} · Google OIDC · Tenant RBAC · Audit enabled</footer>
      </section>
    </div>
    </TooltipProvider>
  );
}
