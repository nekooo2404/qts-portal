'use client';

import { ArrowUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function MarketingEnhancements() {
  const pathname = usePathname();
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    let maxScroll = 0;
    let needsMeasurement = true;

    const syncScroll = () => {
      if (needsMeasurement) {
        maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
        needsMeasurement = false;
      }
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
      root.style.setProperty('--qts-scroll-progress', progress.toFixed(4));
      root.dataset.pageScrolled = window.scrollY > 16 ? 'true' : 'false';
      root.dataset.showBackToTop = window.scrollY > Math.max(480, window.innerHeight * 0.75) ? 'true' : 'false';
    };

    const scheduleSync = (measure = false) => {
      if (measure) needsMeasurement = true;
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        syncScroll();
      });
    };
    const handleScroll = () => scheduleSync();
    const handleResize = () => scheduleSync(true);

    scheduleSync(true);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      root.style.removeProperty('--qts-scroll-progress');
      delete root.dataset.pageScrolled;
      delete root.dataset.showBackToTop;
    };
  }, [pathname]);

  const returnToTop = () => {
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector<HTMLAnchorElement>('.qts-header .qts-brand')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <>
      <span className="qts-scroll-progress" aria-hidden="true" />
      <button
        className="qts-icon-button qts-back-to-top"
        type="button"
        aria-label="Về đầu trang"
        title="Về đầu trang"
        onClick={returnToTop}
      >
        <ArrowUp aria-hidden="true" />
      </button>
    </>
  );
}
