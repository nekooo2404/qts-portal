import type { MetadataRoute } from 'next';

import { DEFAULT_SITE_ORIGIN } from '../marketing/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  // Deviation from the plan's literal `siteUrl('/sitemap.xml')`: siteUrl() always appends a
  // trailing slash to any path other than '/', which is correct for canonical page routes
  // (trailingSlash: true) but wrong for a static XML file — `/sitemap.xml/` is not a valid
  // resource. Build the origin-qualified URL directly instead so the Sitemap directive points
  // at the real generated file.
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_ORIGIN).replace(/\/$/u, '');

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/login/', '/portal/', '/admin/'] }],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
