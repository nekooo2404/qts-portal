'use client';

import { Check, LoaderCircle, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import {
  submitContactRequest,
  validateContactRequest,
  type ContactErrors,
  type ContactRequestDraft,
} from '../../lib/contact';
import type { ServiceInterest } from '../../marketing/content';

type LeadFields = ContactRequestDraft;
type LeadErrors = ContactErrors;

const initialFields: LeadFields = {
  name: '',
  company: '',
  email: '',
  phone: '',
  service: '',
  message: '',
  consent: false,
};

const serviceLabels: Record<ServiceInterest, string> = {
  'website-design': 'Thiết kế website',
  'software-development': 'Phát triển phần mềm',
  'digital-transformation': 'Tư vấn chuyển đổi số',
  'online-advertising': 'Quảng cáo trực tuyến',
  'digital-marketing': 'Digital Marketing',
  'it-solutions': 'Giải pháp công nghệ thông tin',
};

export function LeadForm({ compact = false }: { compact?: boolean }) {
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const touched = useRef<Partial<Record<keyof LeadFields, boolean>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const plan = search.get('goi');
    const service = search.get('dich-vu');
    const solution = search.get('giai-phap');
    const context = plan
      ? `Tôi muốn nhận báo giá cho gói QTS ${plan}. `
      : service
        ? `Tôi muốn trao đổi về dịch vụ ${service}. `
        : solution
          ? `Tôi muốn trao đổi về giải pháp ${solution}. `
          : '';
    if (!context) return;
    const frame = window.requestAnimationFrame(() => {
      setFields((current) => ({ ...current, message: context }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const updateField = <Key extends keyof LeadFields>(field: Key, value: LeadFields[Key]) => {
    const next = { ...fields, [field]: value };
    setFields(next);
    setStatus('idle');
    setStatusMessage('');
    if (touched.current[field]) setErrors(validateContactRequest(next));
  };

  const touchField = (field: keyof LeadFields) => {
    touched.current[field] = true;
    setErrors(validateContactRequest(fields));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateContactRequest(fields);
    setErrors(nextErrors);
    touched.current = Object.fromEntries(
      Object.keys(fields).map((key) => [key, true]),
    ) as Partial<Record<keyof LeadFields, boolean>>;

    if (Object.keys(nextErrors).length > 0 || !fields.service) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setStatus('loading');
    try {
      await submitContactRequest({ ...fields, service: fields.service });
      setStatus('success');
      setStatusMessage('QTS đã nhận yêu cầu và sẽ phản hồi qua email đã cung cấp.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'QTS chưa thể nhận yêu cầu. Hãy thử lại.');
    }
  };

  const fieldError = (field: keyof LeadFields) => errors[field];

  return (
    <form className="qts-lead-form" data-compact={compact} ref={formRef} noValidate aria-busy={status === 'loading'} onSubmit={(event) => void handleSubmit(event)}>
      <Field label="Họ và tên" id="lead-name" error={fieldError('name')}>
        <input id="lead-name" name="name" autoComplete="name" value={fields.name} disabled={status === 'loading'} aria-invalid={Boolean(fieldError('name'))} aria-describedby="lead-name-help" onBlur={() => touchField('name')} onChange={(event) => updateField('name', event.target.value)} />
      </Field>

      <Field label="Công ty" id="lead-company" error={fieldError('company')}>
        <input id="lead-company" name="company" autoComplete="organization" value={fields.company} disabled={status === 'loading'} aria-invalid={Boolean(fieldError('company'))} aria-describedby="lead-company-help" onBlur={() => touchField('company')} onChange={(event) => updateField('company', event.target.value)} />
      </Field>

      <Field label="Email doanh nghiệp" id="lead-email" error={fieldError('email')}>
        <input id="lead-email" name="email" type="email" autoComplete="email" value={fields.email} disabled={status === 'loading'} aria-invalid={Boolean(fieldError('email'))} aria-describedby="lead-email-help" onBlur={() => touchField('email')} onChange={(event) => updateField('email', event.target.value)} />
      </Field>

      <Field label="Số điện thoại" id="lead-phone" error={fieldError('phone')}>
        <input id="lead-phone" name="phone" type="tel" autoComplete="tel" value={fields.phone} disabled={status === 'loading'} aria-invalid={Boolean(fieldError('phone'))} aria-describedby="lead-phone-help" onBlur={() => touchField('phone')} onChange={(event) => updateField('phone', event.target.value)} />
      </Field>

      <Field label="Dịch vụ quan tâm" id="lead-service" error={fieldError('service')}>
        <select id="lead-service" name="service" value={fields.service} disabled={status === 'loading'} aria-invalid={Boolean(fieldError('service'))} aria-describedby="lead-service-help" onBlur={() => touchField('service')} onChange={(event) => updateField('service', event.target.value as LeadFields['service'])}>
          <option value="">Chọn dịch vụ</option>
          {Object.entries(serviceLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </Field>

      <Field className="qts-field--wide" label="Nội dung trao đổi" id="lead-message" error={fieldError('message')} help={`${fields.message.length}/800 ký tự`}>
        <textarea id="lead-message" name="message" maxLength={800} value={fields.message} disabled={status === 'loading'} aria-invalid={Boolean(fieldError('message'))} aria-describedby="lead-message-help" onBlur={() => touchField('message')} onChange={(event) => updateField('message', event.target.value)} />
      </Field>

      <div className="qts-lead-form__footer">
        <label className="qts-consent">
          <input type="checkbox" checked={fields.consent} disabled={status === 'loading'} aria-invalid={Boolean(fieldError('consent'))} aria-describedby="lead-consent-help" onBlur={() => touchField('consent')} onChange={(event) => updateField('consent', event.target.checked)} />
          <span>Tôi đồng ý để QTS sử dụng thông tin đã cung cấp nhằm liên hệ và xử lý yêu cầu này.</span>
        </label>
        <p id="lead-consent-help" className="qts-field__help" data-error={Boolean(fieldError('consent'))}>{fieldError('consent') ?? 'Thông tin chỉ được dùng để xử lý yêu cầu tư vấn.'}</p>

        <button className="qts-button qts-button--on-dark" type="submit" disabled={status === 'loading' || status === 'success'} data-state={status}>
          {status === 'loading' ? <LoaderCircle className="qts-spinner" aria-hidden="true" /> : status === 'success' ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
          {status === 'loading' ? 'Đang gửi yêu cầu' : status === 'success' ? 'Đã nhận yêu cầu' : 'Nhận tư vấn miễn phí'}
        </button>
      </div>

      <p className="qts-lead-form__status" data-tone={status} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{statusMessage}</p>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  help,
  className,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  help?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`qts-field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      <p className="qts-field__help" id={`${id}-help`} data-error={Boolean(error)}>{error ?? help ?? '\u00a0'}</p>
    </div>
  );
}
