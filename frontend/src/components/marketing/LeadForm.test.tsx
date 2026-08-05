import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitContactRequest } from '../../lib/contact';
import { LeadForm } from './LeadForm';

vi.mock('../../lib/contact', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/contact')>(),
  submitContactRequest: vi.fn(),
}));

const submitMock = vi.mocked(submitContactRequest);

beforeEach(() => {
  submitMock.mockReset();
  submitMock.mockResolvedValue({
    id: 'contact-001',
    status: 'NEW',
    createdAt: '2026-08-05T08:00:00.000Z',
  });
});

describe('LeadForm', () => {
  it('submits the corporate contact contract directly', async () => {
    render(<LeadForm />);

    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Minh An' } });
    fireEvent.change(screen.getByLabelText('Công ty'), { target: { value: 'Công ty Minh An' } });
    fireEvent.change(screen.getByLabelText('Email doanh nghiệp'), { target: { value: 'an@minhan.vn' } });
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
    fireEvent.change(screen.getByLabelText('Dịch vụ quan tâm'), { target: { value: 'software-development' } });
    fireEvent.change(screen.getByLabelText('Nội dung trao đổi'), {
      target: { value: 'Cần số hóa quy trình phê duyệt hợp đồng nội bộ.' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Nhận tư vấn miễn phí' }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock).toHaveBeenCalledWith({
      name: 'Nguyễn Minh An',
      company: 'Công ty Minh An',
      email: 'an@minhan.vn',
      phone: '0901234567',
      service: 'software-development',
      message: 'Cần số hóa quy trình phê duyệt hợp đồng nội bộ.',
      consent: true,
    });
    expect(screen.queryByLabelText('Quy mô doanh nghiệp')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('QTS đã nhận yêu cầu');
  });

  it('focuses the first invalid field and does not submit incomplete data', async () => {
    render(<LeadForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Nhận tư vấn miễn phí' }));

    await waitFor(() => expect(screen.getByLabelText('Họ và tên')).toHaveFocus());
    expect(screen.getByText(/Hãy chọn dịch vụ cần QTS trao đổi/)).toBeVisible();
    expect(submitMock).not.toHaveBeenCalled();
  });
});
