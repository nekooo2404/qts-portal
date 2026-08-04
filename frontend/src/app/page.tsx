import type { Metadata } from 'next';

import MarketingPortal from '@/src/screens/MarketingPortal';
import { organizationSchema } from '@/src/marketing/schema';
import { JsonLd } from '@/src/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Thiết kế Website, Phần mềm và Giải pháp Công nghệ',
  description: 'QTS Việt Nam tư vấn, thiết kế website, phát triển phần mềm và triển khai giải pháp công nghệ cho doanh nghiệp.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <><MarketingPortal /><JsonLd value={organizationSchema()} /></>;
}
