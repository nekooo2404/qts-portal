import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

import { serviceMenuGroups, services } from '../content';
import { SearchDialog } from './SearchDialog';

export function SiteHeader() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setMegaOpen(false);
        setMobileOpen(false);
        setSearchOpen(true);
      }

      if (event.key === 'Escape') {
        setMegaOpen(false);
        setMobileOpen(false);
        setSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeNavigation = () => {
    setMegaOpen(false);
    setMobileOpen(false);
  };

  return (
    <Fragment>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href="#top" aria-label="QTS - Trang đầu">
            <img
              src="/qts-logo-160.webp"
              width="48"
              height="48"
              alt="Logo khiên QTS"
            />
            <span>
              <strong>QTS</strong>
              <small>Công nghệ &amp; An ninh</small>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="Điều hướng chính">
            <button
              type="button"
              className="nav-link nav-link--trigger"
              aria-label="Mở danh mục dịch vụ"
              aria-expanded={megaOpen}
              aria-controls="services-mega"
              onClick={() => setMegaOpen((current) => !current)}
            >
              Dịch vụ
              <ChevronDown aria-hidden="true" />
            </button>
            <a className="nav-link" href="#operations">
              Cách làm
            </a>
            <a className="nav-link" href="#resources">
              Tài nguyên
            </a>
            <a className="nav-link" href="#about">
              Về QTS
            </a>
          </nav>

          <div className="site-header__actions">
            <button
              className="icon-button"
              type="button"
              aria-label="Mở tìm kiếm"
              title="Tìm nhanh"
              onClick={() => {
                closeNavigation();
                setSearchOpen(true);
              }}
            >
              <Search aria-hidden="true" />
            </button>
            <a className="button button--primary header-cta" href="#contact">
              Trao đổi với QTS
            </a>
            <button
              className="icon-button mobile-toggle"
              type="button"
              aria-label={mobileOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => {
                setMegaOpen(false);
                setMobileOpen((current) => !current);
              }}
            >
              {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {megaOpen && (
          <div id="services-mega" className="mega-panel">
            <div className="mega-panel__inner">
              {serviceMenuGroups.map((group) => (
                <section className="mega-group" key={group.title}>
                  <h2>{group.title}</h2>
                  {group.serviceIds.map((serviceId) => {
                    const service = services.find((item) => item.id === serviceId);
                    if (!service) return null;

                    return (
                      <a
                        href={`#service-${service.id}`}
                        key={service.id}
                        onClick={closeNavigation}
                      >
                        <strong>{service.title}</strong>
                        <span>{service.description}</span>
                      </a>
                    );
                  })}
                </section>
              ))}
            </div>
          </div>
        )}

        {mobileOpen && (
          <nav
            id="mobile-navigation"
            className="mobile-navigation"
            aria-label="Điều hướng di động"
          >
            <a href="#services" onClick={closeNavigation}>
              Dịch vụ
            </a>
            <a href="#operations" onClick={closeNavigation}>
              Cách làm
            </a>
            <a href="#resources" onClick={closeNavigation}>
              Tài nguyên
            </a>
            <a href="#about" onClick={closeNavigation}>
              Về QTS
            </a>
            <a className="button button--primary" href="#contact" onClick={closeNavigation}>
              Trao đổi với QTS
            </a>
          </nav>
        )}
      </header>

      {megaOpen && (
        <button
          className="nav-scrim"
          type="button"
          aria-label="Đóng danh mục dịch vụ"
          onClick={() => setMegaOpen(false)}
        />
      )}

      {searchOpen && (
        <SearchDialog isOpen onClose={() => setSearchOpen(false)} />
      )}
    </Fragment>
  );
}
