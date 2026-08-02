import {
  AlertTriangle,
  ArrowRight,
  DatabaseZap,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/auth-context';
import type { Workspace } from './auth/types';
import AuthGateway from './components/portal/AuthGateway';
import { PortalLink } from './components/portal/PortalLink';
import { useCurrentPath } from './lib/navigation';
import MarketingPortal from './pages/MarketingPortal';

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
          ? 'Google OIDC chưa được cấu hình. Client Portal không tải dữ liệu cho đến khi backend xác thực tenant và quyền.'
          : 'Google OIDC chưa được cấu hình. Internal Portal không tải dữ liệu SOC cho đến khi backend xác thực tenant và quyền.'}
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

function PortalAccessState({
  icon,
  eyebrow,
  title,
  description,
  note,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <main className="portal-public-state" data-portal="true">
      <img alt="Logo khiên QTS" height="72" src="/qts-logo-160.webp" width="72" />
      {icon}
      <p className="portal-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="portal-access-note" role="note">
        <DatabaseZap aria-hidden="true" />
        <span>{note}</span>
      </div>
      {children}
      <PortalLink className="portal-button portal-button--secondary" to="/company">
        Trang công ty QTS
      </PortalLink>
    </main>
  );
}

function WorkspaceGate({ path, workspace }: { path: string; workspace: Workspace }) {
  const { state, loginHref, logout } = useAuth();

  if (state.status === 'loading') {
    return (
      <main className="portal-loading" data-portal="true" role="status">
        <img alt="Logo khiên QTS" height="40" src="/qts-logo-160.webp" width="40" />
        <span><LoaderCircle aria-hidden="true" /> Đang kiểm tra phiên đăng nhập</span>
      </main>
    );
  }

  if (state.status === 'unconfigured') return <WorkspaceUnavailable workspace={workspace} />;

  if (state.status === 'error') {
    return (
      <PortalAccessState
        description="Backend chưa thể xác nhận session. Portal không cấp quyền truy cập trong trạng thái này."
        eyebrow="IAM · Fail closed"
        icon={<ShieldX aria-hidden="true" />}
        note="Kiểm tra kết nối backend và nhật ký vận hành trước khi thử lại."
        title="Không thể xác minh phiên"
      >
        <PortalLink className="portal-button portal-button--primary" to="/">
          Về cổng truy cập <ArrowRight aria-hidden="true" />
        </PortalLink>
      </PortalAccessState>
    );
  }

  if (state.status === 'anonymous') {
    return (
      <PortalAccessState
        description="Google OIDC đã sẵn sàng nhưng trình duyệt chưa có session QTS hợp lệ."
        eyebrow="IAM · Google OpenID Connect"
        icon={<LockKeyhole aria-hidden="true" />}
        note="Backend sẽ xác minh ID token và chỉ mở workspace sau khi tìm thấy tenant cùng role tương ứng."
        title="Cần đăng nhập"
      >
        <a className="portal-button portal-button--primary" href={loginHref(path)}>
          <LogIn aria-hidden="true" /> Đăng nhập với Google
        </a>
      </PortalAccessState>
    );
  }

  if (state.session.authorization.workspace !== workspace) {
    return (
      <PortalAccessState
        description="Session hợp lệ nhưng không thuộc phân hệ đang yêu cầu."
        eyebrow="RBAC · Truy cập bị từ chối"
        icon={<ShieldX aria-hidden="true" />}
        note="Chỉ workspace do backend cấp từ tenant và role mới được phép mở."
        title="Không có quyền truy cập"
      >
        <PortalLink
          className="portal-button portal-button--primary"
          to={state.session.authorization.workspace === 'client' ? '/client/overview' : '/admin/soc'}
        >
          Mở workspace được cấp <ArrowRight aria-hidden="true" />
        </PortalLink>
      </PortalAccessState>
    );
  }

  const isClient = workspace === 'client';
  return (
    <PortalAccessState
      description={`${state.session.user.displayName} đã đăng nhập qua Google và được backend cấp quyền.`}
      eyebrow={`${isClient ? 'Client' : 'Internal'} · Session hợp lệ`}
      icon={<ShieldCheck aria-hidden="true" />}
      note="API nghiệp vụ chưa được tích hợp nên hệ thống không tạo hoặc hiển thị dữ liệu vận hành giả."
      title={`${isClient ? 'Client' : 'Internal'} Portal đã xác thực`}
    >
      <dl className="portal-session-details" aria-label="Quyền truy cập hiện tại">
        <div><dt>Tenant</dt><dd>{state.session.authorization.tenantId}</dd></div>
        <div><dt>Role</dt><dd>{state.session.authorization.role}</dd></div>
      </dl>
      <button className="portal-button portal-button--primary" onClick={() => void logout()} type="button">
        <LogOut aria-hidden="true" /> Đăng xuất
      </button>
    </PortalAccessState>
  );
}

function AuthenticatedRoutes({ path }: { path: string }) {
  if (path === '/') return <AuthGateway />;
  if (path === '/client' || path.startsWith('/client/')) {
    return <WorkspaceGate path={path} workspace="client" />;
  }
  return <WorkspaceGate path={path} workspace="internal" />;
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

  if (path === '/company') return <MarketingPortal />;
  if (
    path === '/' ||
    path === '/client' ||
    path.startsWith('/client/') ||
    path === '/admin' ||
    path.startsWith('/admin/')
  ) {
    return (
      <AuthProvider>
        <AuthenticatedRoutes path={path} />
      </AuthProvider>
    );
  }
  return <PublicNotFound />;
}
