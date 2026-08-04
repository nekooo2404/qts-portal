import type { Metadata } from 'next';
import { ProjectsPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = {
  title: 'Dự án',
  description: 'QTS Việt Nam giữ cấu trúc hồ sơ dự án sẵn sàng để thay bằng dữ liệu thật ngay khi được xác nhận.',
  alternates: { canonical: '/du-an/' },
};

export default function Page() {
  return <ProjectsPage />;
}
