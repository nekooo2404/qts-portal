import { SITE_NAME, siteUrl } from './site';
import type { Service } from './content';

export function organizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl('/'),
    logo: siteUrl('/qts-logo.webp'),
  };
}

export function serviceSchema(service: Service): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.summary,
    serviceType: service.title,
    url: siteUrl(`/dich-vu/${service.slug}/`),
    provider: organizationSchema(),
  };
}
