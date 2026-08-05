import { serviceInterests, type ServiceInterest } from '../marketing/content';

export type ContactRequest = {
  name: string;
  phone: string;
  email: string;
  company: string;
  service: ServiceInterest;
  message: string;
  consent: boolean;
};

export type ContactRequestDraft = Omit<ContactRequest, 'service'> & {
  service: ServiceInterest | '';
};

export type ContactErrors = Partial<Record<keyof ContactRequest, string>>;

export type ContactSubmission = {
  id: string;
  status: string;
  createdAt: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const SERVICE_INTERESTS = new Set<string>(serviceInterests);

export function validateContactRequest(request: ContactRequestDraft): ContactErrors {
  const errors: ContactErrors = {};
  const name = request.name.trim();
  const company = request.company.trim();
  const email = request.email.trim();
  const phone = request.phone.trim();
  const phoneDigits = phone.replace(/\D/g, '');
  const message = request.message.trim();

  if (name.length < 2 || name.length > 160) {
    errors.name = 'Hãy nhập họ và tên từ 2 đến 160 ký tự.';
  }

  if (company.length < 2 || company.length > 160) {
    errors.company = 'Hãy nhập tên doanh nghiệp từ 2 đến 160 ký tự.';
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Hãy dùng một địa chỉ email doanh nghiệp hợp lệ.';
  }

  if (!/^[+0-9().\s-]+$/u.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.phone = 'Hãy nhập số điện thoại có từ 8 đến 15 chữ số.';
  }

  if (!SERVICE_INTERESTS.has(request.service)) {
    errors.service = 'Hãy chọn dịch vụ cần QTS trao đổi.';
  }

  if (message.length < 20) {
    errors.message = 'Hãy mô tả phạm vi bằng ít nhất 20 ký tự.';
  } else if (message.length > 1200) {
    errors.message = 'Mô tả vượt quá 1.200 ký tự. Hãy rút gọn phạm vi.';
  }

  if (!request.consent) {
    errors.consent = 'Hãy xác nhận QTS có thể liên hệ về yêu cầu này.';
  }

  return errors;
}

export async function submitContactRequest(request: ContactRequest): Promise<ContactSubmission> {
  const response = await fetch('/api/v1/contact-requests', {
    body: JSON.stringify({
      ...request,
      name: request.name.trim(),
      phone: request.phone.trim(),
      email: request.email.trim(),
      company: request.company.trim(),
      message: request.message.trim(),
    }),
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('QTS chưa thể tiếp nhận yêu cầu lúc này. Vui lòng thử lại.');
  }

  const envelope = typeof payload === 'object' && payload !== null
    ? payload as { data?: Partial<ContactSubmission>; error?: { message?: unknown } }
    : {};
  if (!response.ok) {
    throw new Error(
      typeof envelope.error?.message === 'string'
        ? envelope.error.message
        : 'QTS chưa thể tiếp nhận yêu cầu lúc này. Vui lòng thử lại.',
    );
  }
  if (
    typeof envelope.data?.id !== 'string' ||
    typeof envelope.data.status !== 'string' ||
    typeof envelope.data.createdAt !== 'string'
  ) {
    throw new Error('Phản hồi tiếp nhận từ QTS không hợp lệ. Vui lòng thử lại.');
  }
  return envelope.data as ContactSubmission;
}
