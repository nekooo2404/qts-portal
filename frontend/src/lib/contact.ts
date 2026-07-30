export type ContactRequest = {
  email: string;
  service: string;
  message: string;
  consent: boolean;
};

export type ContactErrors = Partial<Record<keyof ContactRequest, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export function validateContactRequest(request: ContactRequest): ContactErrors {
  const errors: ContactErrors = {};
  const email = request.email.trim();
  const message = request.message.trim();

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = 'Hãy dùng một địa chỉ email doanh nghiệp hợp lệ.';
  }

  if (!request.service.trim()) {
    errors.service = 'Hãy chọn nhu cầu cần QTS trao đổi.';
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
