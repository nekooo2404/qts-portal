import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PortalOverview } from '../../portal/types';
import OverviewPage from './OverviewPage';

const { getOverview } = vi.hoisted(() => ({ getOverview: vi.fn() }));

vi.mock('../../portal/api', () => ({ getOverview }));

const overview = {
  scope: { kind: 'ALL_TENANTS', tenantCount: 4 },
  metrics: {
    openAlerts: 2,
    criticalAlerts: 1,
    activeTickets: 3,
    slaBreached: 0,
    totalAssets: 5,
    healthyAssets: 5,
    expiringLicenses: 0,
    unpaidInvoices: 1,
  },
  severityBreakdown: [],
  assetHealth: [],
  threatSeries: [{ day: '2026-08-05T00:00:00.000Z', critical: 1, high: 0, medium: 1, low: 0 }],
  recentAlerts: [],
  recentTickets: [],
  contactRequests: [{
    id: 'contact-001',
    name: 'Nguyễn Minh An',
    phone: '0901234567',
    email: 'minhan@example.vn',
    company: 'Công ty Minh An',
    service: 'it-solutions',
    message: 'Cần đánh giá hạ tầng trước đợt phát hành mới.',
    status: 'NEW',
    createdAt: '2026-08-05T08:00:00.000Z',
  }],
  generatedAt: '2026-08-05T08:05:00.000Z',
} satisfies PortalOverview;

describe('OverviewPage internal mode', () => {
  it('shows the admin command center and actionable contact intake', async () => {
    getOverview.mockResolvedValueOnce(overview);

    render(<OverviewPage mode="internal" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Trung tâm điều hành' })).toBeInTheDocument();
    expect(screen.getByText('Công ty Minh An · Giải pháp công nghệ thông tin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '0901234567' })).toHaveAttribute('href', 'tel:0901234567');
    expect(screen.getByRole('link', { name: 'minhan@example.vn' })).toHaveAttribute('href', 'mailto:minhan@example.vn');
  });
});
