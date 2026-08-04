import type { Metadata } from 'next';
import { LegalPage } from '@/src/components/marketing/PublicPages';

export const metadata: Metadata = { title: 'Điều khoản sử dụng - Bản dự thảo', robots: { index: false }, alternates: { canonical: '/phap-ly/dieu-khoan/' } };
export default function Page() { return <LegalPage type="terms" />; }
