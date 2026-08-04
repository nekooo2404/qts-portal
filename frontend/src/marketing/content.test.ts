import { describe, expect, it } from 'vitest';

import { articles, caseStudies, primaryNavigation, services, solutions } from './content';

describe('marketing content model', () => {
  it('matches the approved IA and placeholder policy', () => {
    expect(primaryNavigation.map((item) => item.href)).toEqual([
      '/',
      '/gioi-thieu',
      '/dich-vu',
      '/giai-phap',
      '/du-an',
      '/tin-tuc',
      '/lien-he',
    ]);
    expect(services.map((item) => item.slug)).toEqual([
      'thiet-ke-website',
      'phat-trien-phan-mem',
      'tu-van-chuyen-doi-so',
      'quang-cao-truc-tuyen',
      'digital-marketing',
      'giai-phap-cong-nghe-thong-tin',
    ]);
    expect(solutions).toHaveLength(6);
    expect(caseStudies.every((item) => item.client === '[TÊN KHÁCH HÀNG]')).toBe(true);
    expect(articles.every((item) => item.isPlaceholder === true)).toBe(true);
  });
});
