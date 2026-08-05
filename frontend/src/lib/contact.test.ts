import { afterEach, describe, expect, it, vi } from 'vitest';

import { submitContactRequest, validateContactRequest } from './contact';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('validateContactRequest', () => {
  it('accepts a complete business security request', () => {
    const result = validateContactRequest({
      name: 'Nguyễn Minh An',
      company: 'Công ty Minh An',
      email: 'an.ninh@doanhnghiep.vn',
      phone: '+84 901 234 567',
      service: 'it-solutions',
      message: 'Can danh gia ung dung truoc khi phat hanh.',
      consent: true,
    });

    expect(result).toEqual({});
  });

  it('returns actionable errors for every invalid field', () => {
    const result = validateContactRequest({
      name: 'A',
      company: '',
      email: 'khong-hop-le',
      phone: '123',
      service: '',
      message: 'ngan',
      consent: false,
    });

    expect(result.name).toContain('họ và tên');
    expect(result.company).toContain('tên doanh nghiệp');
    expect(result.email).toContain('địa chỉ email doanh nghiệp');
    expect(result.phone).toContain('số điện thoại');
    expect(result.service).toContain('dịch vụ');
    expect(result.message).toContain('ít nhất 20 ký tự');
    expect(result.consent).toContain('xác nhận');
  });

  it('trims values before validating their length', () => {
    const result = validateContactRequest({
      name: '  Nguyễn Minh An  ',
      company: '  QTS Việt Nam  ',
      email: '  security@qts.vn  ',
      phone: '  0901 234 567  ',
      service: 'it-solutions',
      message: '                    ',
      consent: true,
    });

    expect(result.email).toBeUndefined();
    expect(result.message).toContain('ít nhất 20 ký tự');
  });
});

describe('submitContactRequest', () => {
  it('posts the normalized request and parses the receipt', async () => {
    const fetchMock = vi.fn<(
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>>(async () => new Response(JSON.stringify({
      data: {
        id: 'contact-001',
        status: 'NEW',
        createdAt: '2026-08-03T08:00:00.000Z',
      },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitContactRequest({
      name: '  Nguyễn Minh An  ',
      company: '  Công ty Minh An  ',
      email: '  prospect@example.vn ',
      phone: '  0901 234 567  ',
      service: 'software-development',
      message: '  Cần đánh giá bề mặt tấn công trước đợt phát hành mới.  ',
      consent: true,
    })).resolves.toEqual({
      id: 'contact-001',
      status: 'NEW',
      createdAt: '2026-08-03T08:00:00.000Z',
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      name: 'Nguyễn Minh An',
      company: 'Công ty Minh An',
      email: 'prospect@example.vn',
      phone: '0901 234 567',
      service: 'software-development',
      message: 'Cần đánh giá bề mặt tấn công trước đợt phát hành mới.',
    });
  });

  it('surfaces the backend problem message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: { code: 'CONTACT_RATE_LIMITED', message: 'Vui lòng thử lại sau.' },
    }), { status: 429, headers: { 'Content-Type': 'application/json' } })));

    await expect(submitContactRequest({
      name: 'Nguyễn Minh An',
      company: 'Công ty Minh An',
      email: 'prospect@example.vn',
      phone: '0901234567',
      service: 'it-solutions',
      message: 'Cần đánh giá bề mặt tấn công trước đợt phát hành mới.',
      consent: true,
    })).rejects.toThrow('Vui lòng thử lại sau.');
  });
});
