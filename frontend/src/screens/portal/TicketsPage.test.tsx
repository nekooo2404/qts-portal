import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PortalSession } from '../../auth/types';
import TicketsPage from './TicketsPage';

const session: PortalSession = {
  user: { email: 'client@example.vn', displayName: 'Client Admin' },
  authorization: { tenantId: 'tenant-001', role: 'client_admin', workspace: 'client' },
  csrfToken: 'csrf-001',
  expiresAt: '2027-08-05T03:00:00.000Z',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TicketsPage', () => {
  it('creates a ticket with the session CSRF token and one UUID idempotency key', async () => {
    const requestKey = '11111111-1111-4111-8111-111111111111';
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(requestKey);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/v1/portal/tickets') && init?.method === 'POST') {
        return new Response(JSON.stringify({ data: { id: 'ticket-001', reference: 'QTS-1', version: 1 } }), {
          headers: { 'Content-Type': 'application/json' }, status: 201,
        });
      }
      if (url.startsWith('/api/v1/portal/tickets')) {
        return new Response(JSON.stringify({
          data: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
        }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<TicketsPage canCreate canManage={false} session={session} tenants={[]} />);
    expect(await screen.findByText('Chưa có ticket')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tạo ticket' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tiêu đề' }), {
      target: { value: 'Mất kết nối VPN' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Mô tả chi tiết' }), {
      target: { value: 'Không thể kết nối VPN từ văn phòng.' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Gửi ticket' }).closest('form')!);

    expect(await screen.findByText('Đã tạo QTS-1.')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input, init]) => (
      String(input) === '/api/v1/portal/tickets' && init?.method === 'POST'
    ));
    expect(call).toBeDefined();
    expect(call?.[1]?.headers).toMatchObject({
      'X-CSRF-Token': 'csrf-001',
      'Idempotency-Key': requestKey,
    });
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      subject: 'Mất kết nối VPN',
      description: 'Không thể kết nối VPN từ văn phòng.',
    });
    await waitFor(() => expect(fetchMock.mock.calls.filter(([input, init]) => (
      String(input).startsWith('/api/v1/portal/tickets') && init?.method === 'GET'
    ))).toHaveLength(2));
  });
});
