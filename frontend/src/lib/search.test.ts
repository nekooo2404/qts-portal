import { describe, expect, it } from 'vitest';

import { filterSearchEntries } from './search';

const entries = [
  {
    id: 'pentest',
    title: 'Kiểm thử xâm nhập',
    description: 'Đánh giá có kiểm soát cho ứng dụng và hạ tầng.',
    keywords: ['pentest', 'ung dung'],
    href: '#services',
    category: 'Năng lực',
  },
  {
    id: 'incident-response',
    title: 'Ứng phó sự cố',
    description: 'Khoanh vùng, phục hồi và rút kinh nghiệm.',
    keywords: ['incident', 'ir'],
    href: '#operations',
    category: 'Năng lực',
  },
];

describe('filterSearchEntries', () => {
  it('matches Vietnamese text without requiring diacritics', () => {
    expect(filterSearchEntries(entries, 'ung pho')).toEqual([entries[1]]);
  });

  it('matches keywords case-insensitively', () => {
    expect(filterSearchEntries(entries, 'PENTEST')).toEqual([entries[0]]);
  });

  it('returns the full index for a blank query', () => {
    expect(filterSearchEntries(entries, '   ')).toEqual(entries);
  });

  it('returns an empty list when no entry matches', () => {
    expect(filterSearchEntries(entries, 'blockchain')).toEqual([]);
  });
});
