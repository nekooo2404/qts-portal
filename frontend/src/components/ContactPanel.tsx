import { Check, Send } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  type ContactErrors,
  type ContactRequest,
  validateContactRequest,
} from '../lib/contact';

const initialRequest: ContactRequest = {
  email: '',
  service: '',
  message: '',
  consent: false,
};

type TouchedFields = Partial<Record<keyof ContactRequest, boolean>>;

export function ContactPanel() {
  const [request, setRequest] = useState<ContactRequest>(initialRequest);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [isReady, setIsReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const touchedRef = useRef<TouchedFields>({});

  const updateField = <Key extends keyof ContactRequest>(
    field: Key,
    value: ContactRequest[Key],
  ) => {
    const nextRequest = { ...request, [field]: value };
    setRequest(nextRequest);
    setIsReady(false);

    if (touchedRef.current[field]) {
      setErrors(validateContactRequest(nextRequest));
    }
  };

  const touchField = (field: keyof ContactRequest) => {
    touchedRef.current[field] = true;
    setErrors(validateContactRequest(request));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateContactRequest(request);
    setErrors(nextErrors);
    touchedRef.current = {
      email: true,
      service: true,
      message: true,
      consent: true,
    };

    if (Object.keys(nextErrors).length > 0) {
      setIsReady(false);
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
      return;
    }

    setIsReady(true);
  };

  return (
    <section id="contact" className="contact-section" aria-labelledby="contact-title">
      <div className="section-shell contact-layout">
        <header className="contact-copy">
          <h2 id="contact-title">Bắt đầu bằng phạm vi thật.</h2>
          <p>
            Cho QTS biết hệ thống cần bảo vệ và quyết định đang chờ. Nội dung hợp
            lệ sẽ sẵn sàng để chuyển vào kênh tiếp nhận của doanh nghiệp.
          </p>
        </header>

        <form ref={formRef} className="contact-form" noValidate onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="contact-email">Email doanh nghiệp</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={request.email}
              autoComplete="email"
              placeholder="security@doanhnghiep.vn"
              aria-required="true"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="contact-email-help"
              onBlur={() => touchField('email')}
              onChange={(event) => updateField('email', event.target.value)}
            />
            <p id="contact-email-help" className="field__help">
              {errors.email ?? 'Dùng địa chỉ để QTS xác định đầu mối trao đổi.'}
            </p>
          </div>

          <div className="field">
            <label htmlFor="contact-service">Nhu cầu trao đổi</label>
            <select
              id="contact-service"
              name="service"
              value={request.service}
              aria-required="true"
              aria-invalid={Boolean(errors.service)}
              aria-describedby="contact-service-help"
              onBlur={() => touchField('service')}
              onChange={(event) => updateField('service', event.target.value)}
            >
              <option value="">Chọn một phạm vi</option>
              <option value="assessment">Đánh giá bề mặt tấn công</option>
              <option value="pentest">Kiểm thử xâm nhập</option>
              <option value="vulnerability">Quản trị lỗ hổng</option>
              <option value="identity-cloud">Cloud &amp; danh tính</option>
              <option value="incident-response">Ứng phó sự cố</option>
              <option value="architecture">Kiến trúc &amp; tuân thủ</option>
            </select>
            <p id="contact-service-help" className="field__help">
              {errors.service ?? 'Chọn điểm gần nhất; phạm vi có thể được điều chỉnh.'}
            </p>
          </div>

          <div className="field field--wide">
            <label htmlFor="contact-message">Phạm vi cần trao đổi</label>
            <textarea
              id="contact-message"
              name="message"
              value={request.message}
              maxLength={1200}
              placeholder="Hệ thống, mốc thời gian và điều cần quyết định"
              aria-required="true"
              aria-invalid={Boolean(errors.message)}
              aria-describedby="contact-message-help"
              onBlur={() => touchField('message')}
              onChange={(event) => updateField('message', event.target.value)}
            />
            <p id="contact-message-help" className="field__help">
              {errors.message ?? `${request.message.length}/1.200 ký tự`}
            </p>
          </div>

          <div className="contact-form__footer">
            <div className="consent-field">
              <label>
                <input
                  type="checkbox"
                  checked={request.consent}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby="contact-consent-help"
                  onBlur={() => touchField('consent')}
                  onChange={(event) => updateField('consent', event.target.checked)}
                />
                <span>QTS có thể liên hệ về yêu cầu này.</span>
              </label>
              <p id="contact-consent-help" className="field__help">
                {errors.consent ?? 'Dữ liệu chưa được gửi vì kênh tiếp nhận chưa được tích hợp.'}
              </p>
            </div>

            <button
              className="button button--primary"
              type="submit"
              data-state={isReady ? 'success' : 'default'}
            >
              {isReady ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
              Kiểm tra yêu cầu
            </button>
          </div>

          <p className="contact-form__status" role="status" aria-live="polite">
            {isReady ? 'Nội dung đã sẵn sàng để chuyển cho QTS.' : ''}
          </p>
        </form>
      </div>
    </section>
  );
}
