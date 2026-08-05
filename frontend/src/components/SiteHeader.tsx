'use client';

import { ChevronDown, Menu, Search, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  primaryNavigation,
  serviceMenu,
  solutionMenu,
  type MarketingLink,
} from '../marketing/content';
import { SearchDialog } from './SearchDialog';

type OpenMenu = 'services' | 'solutions' | null;

const pathMatches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const restoreFocus = (target: HTMLElement | null) => requestAnimationFrame(() => target?.focus());

export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const serviceActive = pathMatches(pathname, '/dich-vu');
  const solutionActive = pathMatches(pathname, '/giai-phap');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpenMenu(null);
        setMobileOpen(false);
        setSearchOpen(true);
      }

      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
        if (mobileOpen) restoreFocus(mobileTriggerRef.current);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [mobileOpen]);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => current === menu ? null : menu);
  };

  const closeNavigation = () => {
    setOpenMenu(null);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="qts-header" ref={headerRef}>
        <div className="qts-header__inner">
          <Link className="qts-brand" href="/">
            <Image src="/qts-logo-160.webp" width={40} height={40} alt="" />
            <span>
              <strong>QTS Việt Nam</strong>
              <small>Thiết kế website · Phần mềm · Giải pháp công nghệ</small>
            </span>
          </Link>

          <nav className="qts-nav" aria-label="Điều hướng chính">
            <div className="qts-nav__menu">
              <button
                type="button"
                className="qts-nav__link"
                data-active={serviceActive}
                aria-expanded={openMenu === 'services'}
                aria-controls="service-navigation"
                onClick={() => toggleMenu('services')}
              >
                Dịch vụ <ChevronDown aria-hidden="true" />
              </button>
              {openMenu === 'services' && (
                <NavDropdown id="service-navigation" title="Dịch vụ QTS" links={serviceMenu} currentPath={pathname} onNavigate={closeNavigation} />
              )}
            </div>

            <div className="qts-nav__menu">
              <button
                type="button"
                className="qts-nav__link"
                data-active={solutionActive}
                aria-expanded={openMenu === 'solutions'}
                aria-controls="solution-navigation"
                onClick={() => toggleMenu('solutions')}
              >
                Giải pháp <ChevronDown aria-hidden="true" />
              </button>
              {openMenu === 'solutions' && (
                <NavDropdown id="solution-navigation" title="Giải pháp theo ngành" links={solutionMenu} currentPath={pathname} onNavigate={closeNavigation} />
              )}
            </div>

            {primaryNavigation.slice(2).map((item) => (
              <Link
                className="qts-nav__link"
                data-active={pathMatches(pathname, item.href)}
                aria-current={pathMatches(pathname, item.href) ? 'page' : undefined}
                href={item.href}
                key={item.href}
                onClick={closeNavigation}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="qts-header__actions">
            <button
              ref={searchTriggerRef}
              className="qts-icon-button qts-search-trigger"
              type="button"
              aria-label="Mở tìm kiếm"
              title="Tìm kiếm"
              onClick={() => {
                setOpenMenu(null);
                setSearchOpen(true);
              }}
            >
              <Search aria-hidden="true" />
            </button>
            <Link className="qts-login-link" href="/login">Đăng nhập</Link>
            <Link className="qts-button qts-button--primary qts-header__cta" href="/lien-he">
              Nhận tư vấn
            </Link>
            <button
              ref={mobileTriggerRef}
              className="qts-icon-button qts-mobile-toggle"
              type="button"
              aria-label={mobileOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => {
                setOpenMenu(null);
                setMobileOpen((current) => !current);
              }}
            >
              {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="qts-mobile-nav" id="mobile-navigation" aria-label="Điều hướng di động">
            <details>
              <summary data-active={serviceActive}>Dịch vụ</summary>
              <div>{serviceMenu.map((item) => <Link href={item.href} key={item.href} aria-current={pathMatches(pathname, item.href) ? 'page' : undefined} onClick={closeNavigation}>{item.label}</Link>)}</div>
            </details>
            <details>
              <summary data-active={solutionActive}>Giải pháp</summary>
              <div>{solutionMenu.map((item) => <Link href={item.href} key={item.href} aria-current={pathMatches(pathname, item.href) ? 'page' : undefined} onClick={closeNavigation}>{item.label}</Link>)}</div>
            </details>
            {primaryNavigation.slice(2).map((item) => <Link href={item.href} key={item.href} aria-current={pathMatches(pathname, item.href) ? 'page' : undefined} onClick={closeNavigation}>{item.label}</Link>)}
            <Link href="/ve-qts" onClick={closeNavigation}>Về QTS</Link>
            <Link href="/ho-tro" onClick={closeNavigation}>Hỗ trợ</Link>
            <div className="qts-mobile-nav__actions">
              <Link className="qts-button qts-button--secondary" href="/login">Đăng nhập</Link>
              <Link className="qts-button qts-button--primary" href="/lien-he">Nhận tư vấn</Link>
            </div>
          </nav>
        )}
      </header>

      {searchOpen && (
        <SearchDialog
          isOpen
          onClose={() => {
            setSearchOpen(false);
            searchTriggerRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function NavDropdown({ id, title, links, currentPath, onNavigate }: { id: string; title: string; links: readonly MarketingLink[]; currentPath: string; onNavigate: () => void }) {
  return (
    <section className="qts-nav-dropdown" id={id} aria-label={title}>
      <div className="qts-nav-dropdown__intro">
        <strong>{title}</strong>
        <p>Chọn đúng phạm vi để xem đầu ra, quy trình và cách QTS triển khai.</p>
      </div>
      <div className="qts-nav-dropdown__links">
        {links.map((item) => (
          <Link href={item.href} key={item.href} aria-current={pathMatches(currentPath, item.href) ? 'page' : undefined} onClick={onNavigate}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
