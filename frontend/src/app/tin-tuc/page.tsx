import type { Metadata } from 'next';
import { NewsPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = {
  title: 'Tin tức',
  description: 'Bài viết và cập nhật đang chờ dữ liệu xác minh từ QTS Việt Nam.',
  alternates: { canonical: '/tin-tuc/' },
};

export default function Page() {
  return <NewsPage />;
}
