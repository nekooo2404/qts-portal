import {
  BadgeCheck,
  Building2,
  DatabaseZap,
  KeyRound,
  LoaderCircle,
  LogIn,
  LogOut,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

import { useAuth } from '../../auth/auth-context';
import { PortalLink } from './PortalLink';

export default function AuthGateway() {
  const { state, loginHref, logout } = useAuth();
  const isConfigured = state.status !== 'unconfigured';
  return (
    <main className="auth-gateway" data-portal="true">
      <section className="auth-identity" aria-label="QTS Operations Portal">
        <PortalLink className="auth-brand" to="/company" aria-label="QTS - Trang công ty">
          <img alt="Logo khiên QTS" height="72" src="/qts-logo-160.webp" width="72" />
          <span>
            <strong>QTS</strong>
            <small>Operations Portal</small>
          </span>
        </PortalLink>

        <div className="auth-signal" aria-hidden="true">
          <span />
          <ShieldCheck />
          <span />
        </div>

        <div className="auth-identity__copy">
          <p className="portal-eyebrow">Vietnam · Security Operations</p>
          <p>Không gian truy cập dành cho khách hàng doanh nghiệp và đội ngũ vận hành QTS.</p>
        </div>

        <div className="auth-trust-line" aria-label="Yêu cầu bảo mật khi triển khai">
          <span><BadgeCheck aria-hidden="true" />IdP doanh nghiệp</span>
          <span><BadgeCheck aria-hidden="true" />MFA theo chính sách Workspace</span>
          <span><BadgeCheck aria-hidden="true" />RBAC phía server</span>
        </div>
      </section>

      <section className="auth-workbench">
        <div className="auth-workbench__inner">
          <header className="auth-heading">
            <p className="portal-eyebrow">
              Identity Gateway · {isConfigured ? 'Google OIDC' : 'Chưa cấu hình'}
            </p>
            <h1>
              {state.status === 'loading'
                ? 'Đang kiểm tra đăng nhập'
                : state.status === 'unconfigured'
                  ? 'Đăng nhập chưa khả dụng'
                  : state.status === 'anonymous'
                    ? 'Đăng nhập vào QTS Portal'
                    : state.status === 'authenticated'
                      ? 'Danh tính đã được xác thực'
                      : 'Không thể xác minh phiên'}
            </h1>
            <p>
              {state.status === 'unconfigured'
                ? 'Portal đang chờ cấu hình Google OpenID Connect được QTS phê duyệt.'
                : state.status === 'anonymous'
                  ? 'Tiếp tục bằng tài khoản Google đã được QTS cấp tenant và role.'
                  : state.status === 'authenticated'
                    ? `Xin chào ${state.session.user.displayName}. Backend đã xác nhận quyền truy cập của bạn.`
                    : state.status === 'error'
                      ? 'Backend chưa thể xác nhận trạng thái đăng nhập. Không có quyền truy cập nào được cấp.'
                      : 'Đang kết nối an toàn tới backend QTS.'}
            </p>
          </header>

          <div className="auth-configuration-note" role="note">
            <KeyRound aria-hidden="true" />
            <span>
              Frontend không chứa tài khoản hoặc phiên đăng nhập cục bộ, không nhận Google token và không lưu session trong localStorage.
            </span>
          </div>

          <div className="auth-requirements" aria-labelledby="auth-requirements-title">
            <h2 id="auth-requirements-title">Điều kiện để mở truy cập</h2>
            <ul>
              <li><Building2 aria-hidden="true" /><span>Client Portal cần tenant và quyền được xác nhận từ backend.</span></li>
              <li><UsersRound aria-hidden="true" /><span>Internal Portal cần danh tính nhân viên và chính sách đặc quyền.</span></li>
              <li><DatabaseZap aria-hidden="true" /><span>Dữ liệu chỉ được tải từ nguồn đã xác thực và phân tách tenant.</span></li>
            </ul>
          </div>

          {state.status === 'loading' && (
            <button className="portal-button portal-button--primary" disabled type="button">
              <LoaderCircle aria-hidden="true" /> Đang kiểm tra
            </button>
          )}
          {state.status === 'unconfigured' && (
            <button className="portal-button portal-button--primary" disabled type="button">
              Đăng nhập chưa khả dụng
            </button>
          )}
          {state.status === 'anonymous' && (
            <a className="portal-button portal-button--primary" href={loginHref('/')}>
              <LogIn aria-hidden="true" /> Đăng nhập với Google
            </a>
          )}
          {state.status === 'authenticated' && (
            <>
              <PortalLink
                className="portal-button portal-button--primary"
                to={state.session.authorization.workspace === 'client' ? '/client/overview' : '/admin/soc'}
              >
                Mở workspace <ShieldCheck aria-hidden="true" />
              </PortalLink>
              <button className="portal-button portal-button--secondary" onClick={() => void logout()} type="button">
                <LogOut aria-hidden="true" /> Đăng xuất
              </button>
            </>
          )}
          <PortalLink className="portal-button portal-button--secondary" to="/company">
            Xem trang công ty QTS
          </PortalLink>

          <footer className="auth-footer">
            <span>Không lưu dữ liệu vận hành trong frontend</span>
            <PortalLink to="/company">Công nghệ &amp; An ninh</PortalLink>
          </footer>
        </div>
      </section>
    </main>
  );
}
