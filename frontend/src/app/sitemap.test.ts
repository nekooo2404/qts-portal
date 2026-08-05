import { describe, expect, it } from 'vitest';

import sitemap from './sitemap';

describe('public sitemap', () => {
  it('contains only canonical public routes', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://qts-viet-nam.example/gioi-thieu/');
    expect(urls).not.toContain('https://qts-viet-nam.example/du-an/');
    expect(urls).not.toContain('https://qts-viet-nam.example/tin-tuc/');
    expect(urls).not.toContain('https://qts-viet-nam.example/ve-qts/');
    expect(urls).not.toContain('https://qts-viet-nam.example/bang-gia/');
    expect(urls).not.toContain('https://qts-viet-nam.example/khach-hang/');
  });
});
