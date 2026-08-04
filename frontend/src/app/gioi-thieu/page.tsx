import type { Metadata } from 'next';
import { AboutPage } from '@/src/components/marketing/PublicPages';
import { organizationSchema } from '@/src/marketing/schema';
import { JsonLd } from '@/src/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Giới thiệu',
  description: 'Năng lực, nguyên tắc và cách QTS Việt Nam đồng hành cùng doanh nghiệp.',
  alternates: { canonical: '/gioi-thieu/' },
};

export default function AboutPageRoute() {
  return (
    <>
      <AboutPage />
      <JsonLd value={organizationSchema()} />
    </>
  );
}
