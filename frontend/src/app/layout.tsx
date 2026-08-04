import type { Metadata } from 'next';
import { Be_Vietnam_Pro, IBM_Plex_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { DEFAULT_SITE_ORIGIN, SITE_NAME } from '../marketing/site';
import './globals.css';

const bodyFont = Be_Vietnam_Pro({
  display: 'swap',
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam-pro',
  weight: ['400', '500', '600', '700'],
});

const dataFont = IBM_Plex_Mono({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['500', '600'],
});

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_ORIGIN;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: 'QTS Việt Nam – Thiết kế Website, Phần mềm và Giải pháp Công nghệ',
    template: `%s | ${SITE_NAME}`,
  },
  description: 'QTS Việt Nam tư vấn, thiết kế website, phát triển phần mềm và triển khai giải pháp công nghệ cho doanh nghiệp.',
  icons: {
    icon: '/qts-logo-160.webp',
    apple: '/qts-logo-160.webp',
  },
  openGraph: {
    locale: 'vi_VN',
    siteName: SITE_NAME,
    title: 'QTS Việt Nam – Thiết kế Website, Phần mềm và Giải pháp Công nghệ',
    description: 'QTS Việt Nam tư vấn, thiết kế website, phát triển phần mềm và triển khai giải pháp công nghệ cho doanh nghiệp.',
    images: ['/qts-logo.webp'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QTS Việt Nam – Thiết kế Website, Phần mềm và Giải pháp Công nghệ',
    description: 'QTS Việt Nam tư vấn, thiết kế website, phát triển phần mềm và triển khai giải pháp công nghệ cho doanh nghiệp.',
    images: ['/qts-logo.webp'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body className={`${bodyFont.variable} ${dataFont.variable}`}>{children}</body>
    </html>
  );
}
