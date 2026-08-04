import type { MetadataRoute } from 'next';

import { articles, caseStudies, services, solutions } from '../marketing/content';
import { siteUrl } from '../marketing/site';

const lastModified = new Date('2026-08-04');

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const fixedRoutes = [
    ['/', 1],
    ['/gioi-thieu/', 0.9],
    ['/dich-vu/', 0.9],
    ['/giai-phap/', 0.9],
    ['/du-an/', 0.8],
    ['/tin-tuc/', 0.8],
    ['/lien-he/', 0.8],
  ] as const;

  return [
    ...fixedRoutes.map(([path, priority]) => ({
      url: siteUrl(path as `/${string}` | '/'),
      lastModified,
      changeFrequency: path === '/' ? 'weekly' as const : 'monthly' as const,
      priority,
    })),
    ...services.map(({ slug }) => ({
      url: siteUrl(`/dich-vu/${slug}/`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...solutions.map(({ slug }) => ({
      url: siteUrl(`/giai-phap/${slug}/`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
    ...caseStudies.map(({ slug }) => ({
      url: siteUrl(`/du-an/${slug}/`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
    ...articles.map(({ slug }) => ({
      url: siteUrl(`/tin-tuc/${slug}/`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
  ];
}
