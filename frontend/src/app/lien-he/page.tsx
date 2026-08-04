import type { Metadata } from 'next';
import { ContactPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = { title: 'Liên hệ', description: 'Gửi yêu cầu tư vấn công nghệ tới QTS Việt Nam.', alternates: { canonical: '/lien-he/' } };
export default function Page() { return <ContactPage />; }
