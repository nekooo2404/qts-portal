'use client';

import { ArrowRight, DatabaseZap, LoaderCircle, LockKeyhole, LogIn, ShieldX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { AuthProvider } from '../../auth/AuthContext';
import { useAuth } from '../../auth/auth-context';
import type { Workspace } from '../../auth/types';
import { PortalLink } from '../../components/portal/PortalLink';
import { SITE_NAME, WORKSPACE_BRAND } from '../../portal/brand';
import PortalWorkspace from './PortalWorkspace';

function AccessState({ children, description, eyebrow, icon, note, title }: {
  children?: ReactNode;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  note: string;
  title: string;
}) {
  return (
    <main className="portal-public-state" data-portal="true" id="main-content">
      <img alt="Logo khiên QTS" height="72" src="/qts-logo-160.webp" width="72" />
      {icon}
      <p className="portal-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="portal-access-note" role="note"><DatabaseZap aria-hidden="true" /><span>{note}</span></div>
      {children}
      <PortalLink className="portal-button portal-button--secondary" to="/">Trang chủ {SITE_NAME}</PortalLink>
    </main>
  );
}

function WorkspaceGate({ path, workspace }: { path: string; workspace: Workspace }) {
  const { state, loginHref, logout } = useAuth();

  if (state.status === 'loading') {
    return <main className="portal-loading" data-portal="true" id="main-content" role="status"><LoaderCircle aria-hidden="true" /> Đang kiểm tra phiên đăng nhập</main>;
  }
  if (state.status === 'unconfigured') {
    return <AccessState description={`Google OIDC chưa được cấu hình nên ${SITE_NAME} chưa thể xác thực tenant và quyền.`} eyebrow="IAM · Chưa cấu hình" icon={<LockKeyhole aria-hidden="true" />} note="Portal chỉ mở sau khi backend xác thực danh tính, tenant và role." title="Workspace chưa khả dụng" />;
  }
  if (state.status === 'error') {
    return <AccessState description="Backend chưa thể xác nhận session và không cấp quyền trong trạng thái này." eyebrow="IAM · Fail closed" icon={<ShieldX aria-hidden="true" />} note="Kiểm tra kết nối backend và thử lại sau." title="Không thể xác minh phiên" />;
  }
  if (state.status === 'anonymous') {
    return (
      <AccessState description="Trình duyệt chưa có session QTS hợp lệ." eyebrow="IAM · Google OpenID Connect" icon={<LockKeyhole aria-hidden="true" />} note="Backend sẽ xác minh danh tính và chỉ mở workspace được cấp." title="Cần đăng nhập">
        <a className="portal-button portal-button--primary" href={loginHref(path)}><LogIn aria-hidden="true" /> Đăng nhập với Google</a>
      </AccessState>
    );
  }
  if (state.session.authorization.workspace !== workspace) {
    return (
      <AccessState description="Session hợp lệ nhưng không thuộc phân hệ đang yêu cầu." eyebrow="RBAC · Truy cập bị từ chối" icon={<ShieldX aria-hidden="true" />} note="Workspace do backend cấp là nguồn quyết định quyền." title="Không có quyền truy cập">
        <PortalLink className="portal-button portal-button--primary" to={state.session.authorization.workspace === 'client' ? WORKSPACE_BRAND.client.homePath : WORKSPACE_BRAND.internal.homePath}>Mở workspace được cấp <ArrowRight aria-hidden="true" /></PortalLink>
      </AccessState>
    );
  }
  return <PortalWorkspace logout={logout} path={path} session={state.session} />;
}

export default function WorkspaceEntry({ workspace }: { workspace: Workspace }) {
  const path = usePathname() ?? (workspace === 'client' ? '/portal' : '/admin');
  return <AuthProvider><WorkspaceGate path={path} workspace={workspace} /></AuthProvider>;
}
