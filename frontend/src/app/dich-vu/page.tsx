import type { Metadata } from 'next';
import { ServicesPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = {
  title: 'Dịch vụ công nghệ',
  description: 'Các nhóm dịch vụ công nghệ QTS Việt Nam triển khai theo mục tiêu và phạm vi của doanh nghiệp.',
  alternates: { canonical: '/dich-vu/' },
};

export default function Page() {
  return <ServicesPage />;
}
