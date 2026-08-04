import type { Metadata } from 'next';
import { SolutionsPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = {
  title: 'Giải pháp theo ngành',
  description: 'Giải pháp QTS Việt Nam theo nhu cầu kinh doanh của từng ngành.',
  alternates: { canonical: '/giai-phap/' },
};

export default function Page() {
  return <SolutionsPage />;
}
