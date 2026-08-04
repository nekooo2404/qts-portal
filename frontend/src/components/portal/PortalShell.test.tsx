import { render, screen } from '@testing-library/react';
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
});
