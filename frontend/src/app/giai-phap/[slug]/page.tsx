import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SolutionPage } from '@/src/components/marketing/PublicPages';
import { getSolution, solutions } from '@/src/marketing/content';

export const dynamicParams = false;
export function generateStaticParams() { return solutions.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const solution = getSolution((await params).slug); return solution ? { title: solution.title, description: solution.summary, alternates: { canonical: `/giai-phap/${solution.slug}/` } } : {}; }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const solution = getSolution((await params).slug); if (!solution) notFound(); return <SolutionPage solution={solution} />; }
