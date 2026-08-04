import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NewsArticlePage } from '@/src/components/marketing/PublicPages';
import { articles, getArticle } from '@/src/marketing/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = getArticle((await params).slug);
  return article ? {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/tin-tuc/${article.slug}/` },
  } : {};
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  return <NewsArticlePage article={article} />;
}
