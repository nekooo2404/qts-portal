import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App';

function renderAt(path: string) {
  window.history.replaceState({}, '', path);
  return render(<App />);
}

function mockAuth({
  configured,
  session,
}: {
  configured: boolean;
  session?: {
    user: { email: string; displayName: string };
    authorization: {
      tenantId: string;
      role: string;
      workspace: 'client' | 'internal';
    };
    csrfToken: string;
    expiresAt: string;
  };
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/v1/auth/status') {
      return new Response(
        JSON.stringify({ data: { configured, provider: 'google' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url === '/api/v1/auth/session') {
      return session
        ? new Response(JSON.stringify({ data: session }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(
            JSON.stringify({ error: { code: 'SESSION_REQUIRED', message: 'Cần đăng nhập.' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
    }
    if (url === '/api/v1/auth/logout' && init?.method === 'POST') {
      return new Response(null, { status: 204 });
    }
    if (url.startsWith('/api/v1/portal/overview')) {
      return new Response(JSON.stringify({
        data: {
          scope: { kind: 'TENANT', id: session?.authorization.tenantId ?? 'tenant-001', name: 'Tenant kiểm thử' },
          metrics: {
            openAlerts: 0, criticalAlerts: 0, activeTickets: 0, slaBreached: 0,
            totalAssets: 0, healthyAssets: 0, expiringLicenses: 0, unpaidInvoices: 0,
          },
          severityBreakdown: [], assetHealth: [],
          threatSeries: [
            { day: '2026-08-03T00:00:00.000Z', critical: 0, high: 0, medium: 0, low: 0 },
          ],
          recentAlerts: [], recentTickets: [], generatedAt: '2026-08-03T08:00:00.000Z',
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (
      url.startsWith('/api/v1/portal/tenants') ||
      url.startsWith('/api/v1/portal/tickets') ||
      url.startsWith('/api/v1/portal/alerts') ||
      url.startsWith('/api/v1/portal/assets')
    ) {
      if (url.startsWith('/api/v1/portal/tickets') && init?.method === 'POST') {
        return new Response(JSON.stringify({ data: { id: 'ticket-001', reference: 'QTS-1', version: 1 } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        data: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('does not expose a local sign-in flow while IAM is not configured', async () => {
    mockAuth({ configured: false });
    renderAt('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Đăng nhập chưa khả dụng' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/không chứa tài khoản hoặc phiên đăng nhập cục bộ/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/mật khẩu/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mã xác thực/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập chưa khả dụng' })).toBeDisabled();
  });

  it('offers Google login only after backend reports OIDC configured', async () => {
    mockAuth({ configured: true });
    renderAt('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Đăng nhập vào QTS Portal' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập với Google' })).toHaveAttribute(
      'href',
      '/api/v1/auth/login/google?returnTo=%2F',
    );
    expect(screen.queryByLabelText(/mật khẩu/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mã xác thực/i)).not.toBeInTheDocument();
  });

  it('keeps the client route data-free until Google OIDC is configured', async () => {
    mockAuth({ configured: false });
    renderAt('/client/overview');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Client Portal chưa khả dụng' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Google OIDC chưa được cấu hình/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/client/overview');
  });

  it('keeps the internal route data-free until Google OIDC is configured', async () => {
    mockAuth({ configured: false });
    renderAt('/admin/soc');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Internal Portal chưa khả dụng' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Google OIDC chưa được cấu hình/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/soc');
  });

  it('opens only the workspace granted by the backend session', async () => {
    mockAuth({
      configured: true,
      session: {
        user: { email: 'client@example.vn', displayName: 'Client Admin' },
        authorization: {
          tenantId: 'tenant-001',
          role: 'client_admin',
          workspace: 'client',
        },
        csrfToken: 'csrf-001',
        expiresAt: '2026-08-03T16:00:00.000Z',
      },
    });
    renderAt('/client/overview');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tổng quan an ninh' }),
    ).toBeInTheDocument();
    expect(screen.getByText('client_admin')).toBeInTheDocument();
    expect(screen.getByText('tenant-001')).toBeInTheDocument();
    expect(screen.getByText('0 cảnh báo đang mở')).toBeInTheDocument();
    expect(screen.getByText(/số 0 là kết quả truy vấn thực tế/i)).toBeInTheDocument();
  });

  it('sends CSRF and an idempotency key when a client creates a ticket', async () => {
    const fetchMock = mockAuth({
      configured: true,
      session: {
        user: { email: 'client@example.vn', displayName: 'Client Admin' },
        authorization: { tenantId: 'tenant-001', role: 'client_admin', workspace: 'client' },
        csrfToken: 'csrf-001',
        expiresAt: '2026-08-03T16:00:00.000Z',
      },
    });
    const user = userEvent.setup();
    renderAt('/client/tickets');

    await user.click(await screen.findByRole('button', { name: 'Tạo ticket' }));
    await user.type(screen.getByRole('textbox', { name: 'Tiêu đề' }), 'Mất kết nối VPN');
    await user.type(screen.getByRole('textbox', { name: 'Mô tả chi tiết' }), 'Không thể kết nối VPN từ văn phòng.');
    await user.click(screen.getByRole('button', { name: 'Gửi ticket' }));

    expect(await screen.findByText('Đã tạo QTS-1.')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input, init]) => (
      String(input) === '/api/v1/portal/tickets' && init?.method === 'POST'
    ));
    expect(call).toBeDefined();
    const headers = call?.[1]?.headers as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe('csrf-001');
    expect(headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('resets resource state when an internal user changes portal modules', async () => {
    mockAuth({
      configured: true,
      session: {
        user: { email: 'admin@qts.com.vn', displayName: 'QTS Admin' },
        authorization: { tenantId: 'qts-vn', role: 'qts_admin', workspace: 'internal' },
        csrfToken: 'csrf-001',
        expiresAt: '2026-08-03T16:00:00.000Z',
      },
    });
    const user = userEvent.setup();
    renderAt('/admin/alerts');

    await user.click(await screen.findByRole('button', { name: 'Ghi nhận cảnh báo' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Ghi nhận cảnh báo' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Tài sản' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Tài sản được bảo vệ' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Ghi nhận cảnh báo' })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/assets');
  });

  it('denies a client session from entering the internal workspace', async () => {
    mockAuth({
      configured: true,
      session: {
        user: { email: 'client@example.vn', displayName: 'Client Admin' },
        authorization: {
          tenantId: 'tenant-001',
          role: 'client_admin',
          workspace: 'client',
        },
        csrfToken: 'csrf-001',
        expiresAt: '2026-08-03T16:00:00.000Z',
      },
    });
    renderAt('/admin/soc');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Không có quyền truy cập' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/workspace do backend cấp/i)).toBeInTheDocument();
  });

  it('sends the server-issued CSRF token when logging out', async () => {
    const fetchMock = mockAuth({
      configured: true,
      session: {
        user: { email: 'security@qts.com.vn', displayName: 'QTS Security' },
        authorization: {
          tenantId: 'qts-vietnam',
          role: 'qts_admin',
          workspace: 'internal',
        },
        csrfToken: 'csrf-001',
        expiresAt: '2026-08-03T16:00:00.000Z',
      },
    });
    const user = userEvent.setup();
    renderAt('/admin/soc');

    await user.click(await screen.findByRole('button', { name: 'Đăng xuất' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-CSRF-Token': 'csrf-001',
      },
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cần đăng nhập' }),
    ).toBeInTheDocument();
  });
});
