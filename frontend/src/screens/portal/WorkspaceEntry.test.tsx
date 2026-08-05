import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PortalSession } from '../../auth/types';
import WorkspaceEntry from './WorkspaceEntry';

const { currentPath } = vi.hoisted(() => ({ currentPath: { value: '/portal/overview' } }));

vi.mock('next/navigation', () => ({ usePathname: () => currentPath.value }));
vi.mock('./PortalWorkspace', () => ({
  default: ({ logout }: { logout: () => Promise<void> }) => (
    <button onClick={() => void logout()} type="button">Đăng xuất thử</button>
  ),
}));

const clientSession: PortalSession = {
  user: { email: 'client@example.vn', displayName: 'Client Admin' },
  authorization: { tenantId: 'tenant-001', role: 'client_admin', workspace: 'client' },
  csrfToken: 'csrf-001',
  expiresAt: '2027-08-05T03:00:00.000Z',
};

function mockAuth(configured: boolean, session?: PortalSession) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/v1/auth/status') {
      return new Response(JSON.stringify({ data: { configured } }), {
        headers: { 'Content-Type': 'application/json' }, status: 200,
      });
    }
    if (url === '/api/v1/auth/session') {
      return session
        ? new Response(JSON.stringify({ data: session }), {
            headers: { 'Content-Type': 'application/json' }, status: 200,
          })
        : new Response(JSON.stringify({ error: { code: 'SESSION_REQUIRED' } }), {
            headers: { 'Content-Type': 'application/json' }, status: 401,
          });
    }
    if (url === '/api/v1/auth/logout' && init?.method === 'POST') {
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  currentPath.value = '/portal/overview';
  vi.unstubAllGlobals();
});

describe('WorkspaceEntry', () => {
  it('fails closed without exposing local credentials when OIDC is unconfigured', async () => {
    mockAuth(false);
    render(<WorkspaceEntry workspace="client" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Workspace chưa khả dụng' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/mật khẩu|mã xác thực/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('denies a client session from the internal workspace', async () => {
    currentPath.value = '/admin/soc';
    mockAuth(true, clientSession);
    render(<WorkspaceEntry workspace="internal" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Không có quyền truy cập' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở workspace được cấp/ })).toHaveAttribute('href', '/portal/overview');
    expect(screen.queryByRole('button', { name: 'Đăng xuất thử' })).not.toBeInTheDocument();
  });

  it('passes the server CSRF token when the granted workspace logs out', async () => {
    currentPath.value = '/admin/soc';
    const session: PortalSession = {
      ...clientSession,
      authorization: { tenantId: 'qts-vietnam', role: 'qts_admin', workspace: 'internal' },
    };
    const fetchMock = mockAuth(true, session);
    render(<WorkspaceEntry workspace="internal" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Đăng xuất thử' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-CSRF-Token': 'csrf-001' },
    }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Cần đăng nhập' })).toBeInTheDocument();
  });
});
