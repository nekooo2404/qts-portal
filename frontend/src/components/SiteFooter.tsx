import Image from 'next/image';
import Link from 'next/link';

const footerGroups = [
  {
    title: 'Nền tảng',
    links: [
      { href: '/dich-vu', label: 'Dịch vụ' },
      { href: '/giai-phap', label: 'Giải pháp' },
      { href: '/bang-gia', label: 'Bảng giá' },
      { href: '/login', label: 'Đăng nhập QTS One' },
    ],
  },
  {
    title: 'QTS Việt Nam',
    links: [
      { href: '/ve-qts', label: 'Về QTS' },
      { href: '/ho-tro', label: 'Hỗ trợ' },
      { href: '/lien-he', label: 'Liên hệ' },
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
            <div><dt>Hoạt động</dt><dd>Tư vấn, triển khai và vận hành giải pháp công nghệ</dd></div>
            <div><dt>Quy trình</dt><dd>Khảo sát · Phạm vi · Nghiệm thu · Hỗ trợ</dd></div>
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
