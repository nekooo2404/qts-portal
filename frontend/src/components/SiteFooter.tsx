import Image from 'next/image';
import Link from 'next/link';

const footerGroups = [
  {
    title: 'Nền tảng',
    links: [
      { href: '/dich-vu', label: 'Dịch vụ' },
      { href: '/giai-phap', label: 'Giải pháp' },
      { href: '/bang-gia', label: 'Bảng giá' },
      { href: '/khach-hang', label: 'Khách hàng' },
    ],
  },
  {
    title: 'QTS Việt Nam',
    links: [
      { href: '/ve-qts', label: 'Về QTS' },
      { href: '/tai-nguyen', label: 'Trung tâm kiến thức' },
      { href: '/ho-tro', label: 'Hỗ trợ' },
      { href: '/lien-he', label: 'Liên hệ' },
    ],
  },
  {
    title: 'Pháp lý',
    links: [
      { href: '/phap-ly/bao-mat', label: 'Chính sách bảo mật' },
      { href: '/phap-ly/dieu-khoan', label: 'Điều khoản sử dụng' },
      { href: '/phap-ly/bao-mat#cookie', label: 'Thiết lập cookie' },
      { href: '/login', label: 'Đăng nhập QTS Việt Nam' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="qts-footer">
      <div className="qts-shell qts-footer__statement">
        <p>Toàn bộ vận hành công nghệ. Một nơi để nhìn và hành động.</p>
        <Link className="qts-text-link" href="/lien-he">Bắt đầu trao đổi <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="qts-shell qts-footer__grid">
        <div className="qts-footer__mast">
          <Link className="qts-brand qts-brand--footer" href="/">
            <Image src="/qts-logo-160.webp" width={44} height={44} alt="" />
            <span><strong>QTS Việt Nam</strong><small>Thiết kế website · Phần mềm · Giải pháp công nghệ</small></span>
          </Link>
          <p>Website, phần mềm, hạ tầng, marketing và hỗ trợ kỹ thuật được quản lý trên một hệ thống.</p>
          <dl>
            <div><dt>Pháp nhân</dt><dd>© 2026 Công ty CP Công nghệ QTS Việt Nam</dd></div>
            <div><dt>Liên hệ</dt><dd>[EMAIL] · [SỐ ĐIỆN THOẠI]</dd></div>
            <div><dt>Địa chỉ</dt><dd>[ĐỊA CHỈ]</dd></div>
          </dl>
        </div>

        {footerGroups.map((group) => (
          <nav className="qts-footer__group" aria-label={group.title} key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          </nav>
        ))}
      </div>
      <div className="qts-shell qts-footer__meta">
        <span>QTS Việt Nam · Thành lập năm 2011</span>
        <span>© 2026 Công ty CP Công nghệ QTS Việt Nam. All rights reserved.</span>
      </div>
    </footer>
  );
}
