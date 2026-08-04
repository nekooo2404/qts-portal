import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ServicePage } from '@/src/components/marketing/PublicPages';
import { getService, services } from '@/src/marketing/content';
import { serviceSchema } from '@/src/marketing/schema';
import { JsonLd } from '@/src/components/marketing/JsonLd';

export const dynamicParams = false;
export function generateStaticParams() { return services.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const service = getService((await params).slug); return service ? { title: service.title, description: service.summary, alternates: { canonical: `/dich-vu/${service.slug}/` } } : {}; }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const service = getService((await params).slug); if (!service) notFound(); return <><ServicePage service={service} /><JsonLd value={serviceSchema(service)} /></>; }
