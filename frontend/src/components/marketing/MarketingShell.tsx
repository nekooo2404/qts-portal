import type { ReactNode } from 'react';

import { SiteFooter } from '../SiteFooter';
import { SiteHeader } from '../SiteHeader';
import { MarketingEnhancements } from './MarketingEnhancements';

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <SiteHeader />
      <MarketingEnhancements />
      {children}
      <SiteFooter />
    </>
  );
}
