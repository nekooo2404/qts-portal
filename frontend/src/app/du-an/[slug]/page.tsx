import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CaseStudyPage } from '@/src/components/marketing/PublicPages';
import { caseStudies, getProject } from '@/src/marketing/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = getProject((await params).slug);
  return project ? {
    title: project.title,
    description: 'Hồ sơ dự án đang chờ dữ liệu xác minh từ QTS Việt Nam.',
    alternates: { canonical: `/du-an/${project.slug}/` },
  } : {};
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  return <CaseStudyPage item={project} />;
}
