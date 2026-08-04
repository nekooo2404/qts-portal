import type { Metadata } from 'next';
import { LegalPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = { title: 'Chính sách bảo mật - Bản dự thảo', robots: { index: false }, alternates: { canonical: '/phap-ly/bao-mat/' } };
export default function Page() { return <LegalPage type="privacy" />; }
