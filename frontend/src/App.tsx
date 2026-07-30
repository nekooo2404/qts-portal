import { AlertTriangle, ArrowRight, DatabaseZap, LockKeyhole } from 'lucide-react';
import { useEffect } from 'react';

import AuthGateway from './components/portal/AuthGateway';
import { PortalLink } from './components/portal/PortalLink';
import { useCurrentPath } from './lib/navigation';
import MarketingPortal from './pages/MarketingPortal';

type Workspace = 'client' | 'internal';

function WorkspaceUnavailable({ workspace }: { workspace: Workspace }) {
  const isClient = workspace === 'client';
  const title = isClient
    ? 'Client Portal chưa khả dụng'
    : 'Internal Portal chưa khả dụng';

  return (
    <main className="portal-public-state" data-portal="true">
      <img alt="Logo khiên QTS" height="72" src="/qts-logo-160.webp" width="72" />
      <LockKeyhole aria-hidden="true" />
      <p className="portal-eyebrow">IAM · Truy cập chưa được cấu hình</p>
      <h1>{title}</h1>
      <p>
        {isClient
          ? 'IAM và API nghiệp vụ chưa được tích hợp. Client Portal không cung cấp dữ liệu cục bộ.'
          : 'IAM và API nghiệp vụ chưa được tích hợp. Internal Portal không có dữ liệu SOC cục bộ.'}
      </p>
      <div className="portal-access-note" role="note">
        <DatabaseZap aria-hidden="true" />
        <span>
          Hệ thống chỉ mở workspace sau khi xác thực thật, kiểm quyền phía server và xác định đúng tenant.
        </span>
      </div>
      <PortalLink className="portal-button portal-button--primary" to="/">
        Về cổng truy cập <ArrowRight aria-hidden="true" />
      </PortalLink>
      <PortalLink className="portal-button portal-button--secondary" to="/company">
        Trang công ty QTS
      </PortalLink>
    </main>
  );
}

function PublicNotFound() {
  return (
    <main className="portal-public-state" data-portal="true">
      <img alt="Logo khiên QTS" height="72" src="/qts-logo-160.webp" width="72" />
      <AlertTriangle aria-hidden="true" />
      <p className="portal-eyebrow">404 · QTS Portal</p>
      <h1>Không tìm thấy đường dẫn</h1>
      <p>Trang đã yêu cầu không tồn tại hoặc đã được chuyển sang khu vực khác.</p>
      <PortalLink className="portal-button portal-button--primary" to="/">
        Về cổng truy cập <ArrowRight aria-hidden="true" />
      </PortalLink>
    </main>
  );
}

export default function App() {
  const path = useCurrentPath();

  useEffect(() => {
    const section = path.startsWith('/client')
      ? 'Client Portal'
      : path.startsWith('/admin')
        ? 'Internal Portal'
        : path === '/company'
          ? 'Công nghệ và An ninh'
          : 'Operations Portal';
    document.title = `QTS | ${section}`;
  }, [path]);

  if (path === '/') return <AuthGateway />;
  if (path === '/company') return <MarketingPortal />;
  if (path === '/client' || path.startsWith('/client/')) {
    return <WorkspaceUnavailable workspace="client" />;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <WorkspaceUnavailable workspace="internal" />;
  }
  return <PublicNotFound />;
}
