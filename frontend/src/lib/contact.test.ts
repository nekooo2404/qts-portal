import { describe, expect, it } from 'vitest';

import { validateContactRequest } from './contact';

describe('validateContactRequest', () => {
  it('accepts a complete business security request', () => {
    const result = validateContactRequest({
      email: 'an.ninh@doanhnghiep.vn',
      service: 'pentest',
      message: 'Can danh gia ung dung truoc khi phat hanh.',
      consent: true,
    });

    expect(result).toEqual({});
  });

  it('returns actionable errors for every invalid field', () => {
    const result = validateContactRequest({
      email: 'khong-hop-le',
      service: '',
      message: 'ngan',
      consent: false,
    });

    expect(result.email).toContain('địa chỉ email doanh nghiệp');
    expect(result.service).toContain('nhu cầu');
    expect(result.message).toContain('ít nhất 20 ký tự');
    expect(result.consent).toContain('xác nhận');
  });

  it('trims values before validating their length', () => {
    const result = validateContactRequest({
      email: '  security@qts.vn  ',
      service: 'assessment',
      message: '                    ',
      consent: true,
    });

    expect(result.email).toBeUndefined();
    expect(result.message).toContain('ít nhất 20 ký tự');
  });
});
