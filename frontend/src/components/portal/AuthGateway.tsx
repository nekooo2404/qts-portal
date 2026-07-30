import {
  BadgeCheck,
  Building2,
  DatabaseZap,
  KeyRound,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

import { PortalLink } from './PortalLink';

export default function AuthGateway() {
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
          <span><BadgeCheck aria-hidden="true" />MFA bắt buộc</span>
          <span><BadgeCheck aria-hidden="true" />RBAC phía server</span>
        </div>
      </section>

      <section className="auth-workbench">
        <div className="auth-workbench__inner">
          <header className="auth-heading">
            <p className="portal-eyebrow">Identity Gateway · Chưa cấu hình</p>
            <h1>Đăng nhập chưa khả dụng</h1>
            <p>Portal đang chờ kết nối với hệ thống định danh và API nghiệp vụ được QTS phê duyệt.</p>
          </header>

          <div className="auth-configuration-note" role="note">
            <KeyRound aria-hidden="true" />
            <span>
              Frontend không chứa tài khoản hoặc phiên đăng nhập cục bộ. Không có mật khẩu, OTP hay SSO thay thế.
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

          <button className="portal-button portal-button--primary" disabled type="button">
            Đăng nhập chưa khả dụng
          </button>
          <PortalLink className="portal-button portal-button--secondary" to="/company">
            Xem trang công ty QTS
          </PortalLink>

          <footer className="auth-footer">
            <span>Không lưu dữ liệu vận hành trong frontend</span>
            <PortalLink to="/company">Công nghệ & An ninh</PortalLink>
          </footer>
        </div>
      </section>
    </main>
  );
}
