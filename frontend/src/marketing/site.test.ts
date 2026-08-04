import { describe, expect, it } from 'vitest';

import { DEFAULT_SITE_ORIGIN, RETIRED_PUBLIC_ROUTES, SITE_NAME, siteUrl } from './site';

describe('marketing site contract', () => {
  it('keeps the approved brand and canonical helpers', () => {
    expect(SITE_NAME).toBe('QTS Việt Nam');
    expect(DEFAULT_SITE_ORIGIN).toBe('https://qts-viet-nam.example');
    expect(RETIRED_PUBLIC_ROUTES['/company/']).toBe('/gioi-thieu/');
    expect(siteUrl('/tin-tuc/')).toBe('https://qts-viet-nam.example/tin-tuc/');
  });
});
