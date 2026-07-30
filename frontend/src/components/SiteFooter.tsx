export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="section-shell site-footer__inner">
        <p className="site-footer__statement">
          Bảo vệ điều quan trọng. Vận hành điều tiếp theo.
        </p>

        <div className="site-footer__meta">
          <a className="brand brand--footer" href="#top" aria-label="QTS - Về đầu trang">
            <img
              src="/qts-logo-160.webp"
              width="40"
              height="40"
              loading="lazy"
              decoding="async"
              alt=""
            />
            <strong>QTS</strong>
          </a>

          <nav aria-label="Điều hướng cuối trang">
            <a href="#services">Dịch vụ</a>
            <a href="#resources">Tài nguyên</a>
            <a href="#contact">Liên hệ</a>
          </nav>

          <span>QTS · Việt Nam · 2026</span>
        </div>
      </div>
    </footer>
  );
}
