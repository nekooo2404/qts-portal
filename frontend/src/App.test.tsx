import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import App from './App';

function renderAt(path: string) {
  window.history.replaceState({}, '', path);
  return render(<App />);
}

describe('QTS portal', () => {
  it('presents the QTS brand and primary security path', () => {
    renderAt('/company');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Thấy rủi ro. Giữ vững vận hành.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Logo khiên QTS')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Đặt lịch đánh giá' }),
    ).toHaveAttribute('href', '#contact');
  });

  it('opens and closes the service mega menu', async () => {
    const user = userEvent.setup();
    renderAt('/company');

    const trigger = screen.getByRole('button', { name: 'Mở danh mục dịch vụ' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Kiểm thử xâm nhập/ })).toBeVisible();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('finds a service with an unaccented Vietnamese query', async () => {
    const user = userEvent.setup();
    renderAt('/company');

    await user.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));
    const input = screen.getByRole('searchbox', { name: 'Tìm trong portal' });
    await user.type(input, 'ung pho');

    expect(screen.getByRole('link', { name: /ứng phó sự cố/i })).toHaveAttribute(
      'href',
      '#service-incident-response',
    );
    expect(screen.queryByRole('link', { name: /Kiểm thử xâm nhập/ })).not.toBeInTheDocument();
  });

  it('closes search with Escape and resets the previous query', async () => {
    const user = userEvent.setup();
    renderAt('/company');

    await user.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Tìm trong portal' }),
      'ung pho',
    );
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mở tìm kiếm' }));
    expect(screen.getByRole('searchbox', { name: 'Tìm trong portal' })).toHaveValue('');
  });

  it('updates the security map detail when a node is selected', async () => {
    const user = userEvent.setup();
    renderAt('/company');

    await user.click(screen.getByRole('button', { name: 'Ứng phó sự cố' }));

    expect(screen.getByText(/Khoanh vùng, phục hồi và rút kinh nghiệm/)).toBeVisible();
  });

  it('validates the contact request and confirms a complete draft', async () => {
    const user = userEvent.setup();
    renderAt('/company');

    await user.click(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' }));
    expect(screen.getByText(/địa chỉ email doanh nghiệp/)).toBeVisible();
    expect(screen.getByText(/ít nhất 20 ký tự/)).toBeVisible();

    await user.type(
      screen.getByRole('textbox', { name: 'Email doanh nghiệp' }),
      'security@doanhnghiep.vn',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Nhu cầu trao đổi' }),
      'pentest',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Phạm vi cần trao đổi' }),
      'Can danh gia ung dung web truoc dot phat hanh tiep theo.',
    );
    await user.click(
      screen.getByRole('checkbox', { name: /QTS có thể liên hệ/ }),
    );
    await user.click(screen.getByRole('button', { name: 'Kiểm tra yêu cầu' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Nội dung đã sẵn sàng để chuyển cho QTS.',
    );
  });

  it('does not expose a local sign-in flow while IAM is not configured', () => {
    renderAt('/');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Đăng nhập chưa khả dụng' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/không chứa tài khoản hoặc phiên đăng nhập cục bộ/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/mật khẩu/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mã xác thực/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập chưa khả dụng' })).toBeDisabled();
  });

  it('keeps the client route data-free until IAM and APIs are integrated', () => {
    renderAt('/client/overview');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Client Portal chưa khả dụng' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/IAM và API nghiệp vụ chưa được tích hợp/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/client/overview');
  });

  it('keeps the internal route data-free until IAM and APIs are integrated', () => {
    renderAt('/admin/soc');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Internal Portal chưa khả dụng' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/không có dữ liệu SOC cục bộ/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/soc');
  });
});
