import type { Metadata } from 'next';
import { ProjectsPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = {
  title: 'Dự án',
  description: 'Hồ sơ dự án QTS Việt Nam đã được xác minh và cho phép công bố.',
  alternates: { canonical: '/du-an/' },
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ProjectsPage />;
}
