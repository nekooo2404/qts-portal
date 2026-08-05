import type { Metadata } from 'next';
import { NewsPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = {
  title: 'Tin tức',
  description: 'Bài viết và cập nhật chính thức từ QTS Việt Nam.',
  alternates: { canonical: '/tin-tuc/' },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <NewsPage />;
}
