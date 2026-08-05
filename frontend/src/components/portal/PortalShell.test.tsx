import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PortalShell from './PortalShell';

const clientSession = {
  user: { displayName: 'Nguyễn Hữu A', email: 'a@example.vn' },
  authorization: { workspace: 'client', role: 'client_admin', tenantId: 'tenant-001' },
} as const;

describe('PortalShell branding', () => {
  it('shows the shared company brand and the client workspace label', () => {
    render(
      <PortalShell
        onLogout={vi.fn(async () => {})}
        path="/portal/overview"
        selectedTenantId={undefined}
        session={clientSession as never}
        setSelectedTenantId={vi.fn()}
        tenants={[]}
      >
        <main id="portal-main">Nội dung kiểm thử</main>
      </PortalShell>,
    );

    expect(screen.getByText('QTS Việt Nam')).toBeInTheDocument();
    expect(screen.getByText('Cổng khách hàng')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Trang chủ QTS Việt Nam/i })).toHaveAttribute('href', '/');
  });

  it('moves focus into the mobile rail and restores it on Escape', async () => {
    const user = userEvent.setup();
    render(
      <PortalShell
        onLogout={vi.fn(async () => {})}
        path="/portal/overview"
        selectedTenantId={undefined}
        session={clientSession as never}
        setSelectedTenantId={vi.fn()}
        tenants={[]}
      >
        <main id="portal-main">Nội dung kiểm thử</main>
      </PortalShell>,
    );

    const trigger = screen.getByRole('button', { name: 'Mở menu' });
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
