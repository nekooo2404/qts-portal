export const SITE_NAME = 'QTS Việt Nam';
export const DEFAULT_SITE_ORIGIN = 'https://qts-viet-nam.example';
export const RETIRED_PUBLIC_ROUTES = {
  '/ve-qts/': '/gioi-thieu/',
  '/khach-hang/': '/du-an/',
  '/tai-nguyen/': '/tin-tuc/',
  '/bang-gia/': '/lien-he/',
  '/ho-tro/': '/lien-he/',
  '/company/': '/gioi-thieu/',
} as const;

export function siteUrl(path: `/${string}` | '/'): string {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_ORIGIN).replace(/\/$/u, '');
  const normalized = path === '/' ? '/' : path.endsWith('/') ? path : `${path}/`;
  return `${origin}${normalized}`;
}
