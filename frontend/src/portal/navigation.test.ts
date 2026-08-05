import { describe, expect, it } from 'vitest';

import type { PortalSession } from '../auth/types';
import { navigationFor } from './navigation';

function session(role: PortalSession['authorization']['role']): PortalSession {
  return {
    user: { displayName: 'QTS User', email: 'user@example.vn' },
    authorization: { workspace: 'client', role, tenantId: 'tenant-001' },
    csrfToken: 'csrf-token',
    expiresAt: '2030-01-01T00:00:00.000Z',
  };
}

describe('client portal navigation', () => {
  it('groups the client admin workflow into four business sections', () => {
    const navigation = navigationFor(session('client_admin'));

    expect([...new Set(navigation.map((item) => item.section))]).toEqual([
      'Tổng quan',
      'Vận hành',
      'Hồ sơ dịch vụ',
      'Tổ chức',
    ]);
    expect(navigation.map((item) => item.label)).toEqual([
      'Tổng quan', 'Ticket', 'Cảnh báo', 'Tài sản', 'License', 'Hợp đồng',
      'Hóa đơn', 'Tài liệu', 'Tri thức', 'Thành viên', 'Nhật ký hoạt động',
    ]);
  });

  it('does not expose member management to a viewer', () => {
    expect(navigationFor(session('client_viewer')).map((item) => item.label)).not.toContain('Thành viên');
  });
});
