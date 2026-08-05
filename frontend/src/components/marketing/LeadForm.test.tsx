import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
    render(<LeadForm />);

    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Minh An');
    await user.type(screen.getByLabelText('Công ty'), 'Công ty Minh An');
    await user.type(screen.getByLabelText('Email doanh nghiệp'), 'an@minhan.vn');
    await user.type(screen.getByLabelText('Số điện thoại'), '0901234567');
    await user.selectOptions(screen.getByLabelText('Dịch vụ quan tâm'), 'software-development');
    await user.type(screen.getByLabelText('Nội dung trao đổi'), 'Cần số hóa quy trình phê duyệt hợp đồng nội bộ.');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Nhận tư vấn miễn phí' }));

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
    const user = userEvent.setup();
    render(<LeadForm />);

    await user.click(screen.getByRole('button', { name: 'Nhận tư vấn miễn phí' }));

    await waitFor(() => expect(screen.getByLabelText('Họ và tên')).toHaveFocus());
    expect(screen.getByText(/Hãy chọn dịch vụ cần QTS trao đổi/)).toBeVisible();
    expect(submitMock).not.toHaveBeenCalled();
  });
});
