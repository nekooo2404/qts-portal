import { Badge } from '../ui/Badge';

const LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động', ACKNOWLEDGED: 'Đã tiếp nhận', ALL: 'Tất cả',
  ARCHIVED: 'Lưu trữ', CANCELLED: 'Đã hủy', CLIENT: 'Khách hàng',
  CLOSED: 'Đã đóng', COMPLETED: 'Hoàn thành', CONFIGURED: 'Đã cấu hình',
  CRITICAL: 'Nghiêm trọng', DEGRADED: 'Suy giảm', DISABLED: 'Vô hiệu',
  DOWN: 'Mất kết nối', DRAFT: 'Nháp', EXPIRED: 'Hết hạn',
  EXPIRING: 'Sắp hết hạn', HEALTHY: 'Tốt', HIGH: 'Cao', INFO: 'Thông tin',
  INTERNAL: 'Nội bộ', IN_PROGRESS: 'Đang xử lý', ISSUED: 'Đã phát hành',
  LOW: 'Thấp', MAINTENANCE: 'Bảo trì', MEDIUM: 'Trung bình',
  NEW: 'Mới', OPEN: 'Mở', OVERDUE: 'Quá hạn', PAID: 'Đã thanh toán',
  PENDING: 'Đang chờ', PUBLISHED: 'Đã xuất bản', RESOLVED: 'Đã xử lý',
  RETIRED: 'Ngừng sử dụng', REVOKED: 'Đã thu hồi', SCHEDULED: 'Đã lên lịch',
  SUSPENDED: 'Tạm ngưng', TERMINATED: 'Đã chấm dứt', UNKNOWN: 'Chưa xác định',
  CONTACTED: 'Đã liên hệ', VOID: 'Đã hủy', WAITING_CUSTOMER: 'Chờ khách hàng',
};

function toneFor(value: string): 'critical' | 'warning' | 'healthy' | 'info' | 'neutral' {
  if (['CRITICAL', 'DOWN', 'OVERDUE', 'BREACHED'].includes(value)) return 'critical';
  if (['HIGH', 'DEGRADED', 'EXPIRING', 'WAITING_CUSTOMER'].includes(value)) return 'warning';
  if (['ACTIVE', 'HEALTHY', 'PAID', 'PUBLISHED', 'RESOLVED', 'COMPLETED'].includes(value)) return 'healthy';
  if (['INFO', 'NEW', 'CONTACTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ISSUED', 'CONFIGURED'].includes(value)) return 'info';
  return 'neutral';
}

export function PortalStatus({ value }: { value: unknown }) {
  const normalized = typeof value === 'string' ? value : 'UNKNOWN';
  return (
    <Badge tone={toneFor(normalized)}>
      <span className="portal-status__mark" aria-hidden="true" />
      {LABELS[normalized] ?? normalized}
    </Badge>
  );
}
