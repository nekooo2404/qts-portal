import { permanentRedirect } from 'next/navigation';

import { caseStudies } from '@/src/marketing/content';

export const dynamicParams = false;

// generateStaticParams is required for a dynamic segment to work with `output: 'export'`.
// The old khach-hang/[slug] case-study slugs are still enumerated by caseStudies so each
// retired URL can be resolved to its canonical /du-an/[slug]/ replacement at build time.
export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export default async function LegacyCaseStudyRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/du-an/${slug}/`);
}
