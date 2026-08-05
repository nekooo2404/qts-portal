import type { PortalResource } from './types';

export interface SelectOption {
  label: string;
  value: string;
}

export interface ResourceField {
  name: string;
  label: string;
  type?: 'date' | 'datetime-local' | 'email' | 'number' | 'password' | 'select' | 'text' | 'textarea' | 'url';
  options?: SelectOption[];
  required?: boolean;
  wide?: boolean;
  min?: number;
  max?: number;
  step?: number;
  createOnly?: boolean;
  updateOnly?: boolean;
}

export interface ResourceColumn {
  key: string;
  label: string;
  format?: 'date' | 'datetime' | 'money' | 'status' | 'text';
}

export interface ResourceDefinition {
  resource: PortalResource;
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  createLabel: string;
  columns: ResourceColumn[];
  fields: ResourceField[];
  defaultValues?: Record<string, string>;
}

const severity = [
  { value: 'CRITICAL', label: 'Nghiêm trọng' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'LOW', label: 'Thấp' },
];

export const RESOURCE_DEFINITIONS: Record<PortalResource, ResourceDefinition> = {
  alerts: {
    resource: 'alerts',
    eyebrow: 'Vận hành · An toàn thông tin',
    title: 'Cảnh báo dịch vụ',
    description: 'Theo dõi tín hiệu từ các nguồn giám sát được QTS phê duyệt và trạng thái xử lý hiện tại.',
    emptyTitle: 'Chưa ghi nhận cảnh báo',
    emptyDescription: 'Danh sách sẽ xuất hiện khi nguồn tích hợp gửi cảnh báo vận hành thật.',
    createLabel: 'Ghi nhận cảnh báo',
    columns: [
      { key: 'title', label: 'Cảnh báo' },
      { key: 'tenantName', label: 'Khách hàng' },
      { key: 'severity', label: 'Mức độ', format: 'status' },
      { key: 'source', label: 'Nguồn' },
      { key: 'status', label: 'Trạng thái', format: 'status' },
      { key: 'detectedAt', label: 'Phát hiện', format: 'datetime' },
    ],
    fields: [
      { name: 'externalRef', label: 'Mã cảnh báo nguồn', createOnly: true },
      { name: 'title', label: 'Tiêu đề', required: true, createOnly: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', required: true, wide: true, createOnly: true },
      { name: 'severity', label: 'Mức độ', type: 'select', options: [...severity, { value: 'INFO', label: 'Thông tin' }], required: true },
      { name: 'source', label: 'Nguồn phát hiện', required: true, createOnly: true },
      { name: 'assetId', label: 'ID tài sản liên quan', createOnly: true },
      { name: 'detectedAt', label: 'Thời điểm phát hiện', type: 'datetime-local', required: true, createOnly: true },
      { name: 'status', label: 'Trạng thái', type: 'select', options: [
        { value: 'OPEN', label: 'Mở' }, { value: 'ACKNOWLEDGED', label: 'Đã tiếp nhận' },
        { value: 'RESOLVED', label: 'Đã xử lý' },
      ], updateOnly: true },
    ],
    defaultValues: { severity: 'MEDIUM' },
  },
  tickets: {
    resource: 'tickets', eyebrow: 'Vận hành · SLA', title: 'Ticket',
    description: 'Theo dõi yêu cầu, phản hồi, người phụ trách và cam kết SLA trên một luồng có lịch sử.',
    emptyTitle: 'Chưa có ticket', emptyDescription: 'Tạo ticket đầu tiên khi cần QTS hỗ trợ hoặc xử lý sự cố.',
    createLabel: 'Tạo ticket', columns: [], fields: [],
  },
  assets: {
    resource: 'assets',
    eyebrow: 'Vận hành · Tài sản',
    title: 'Tài sản số',
    description: 'Danh mục thiết bị, hệ thống, ứng dụng, chủ sở hữu và trạng thái sức khỏe hiện tại.',
    emptyTitle: 'Chưa có tài sản',
    emptyDescription: 'Tài sản chỉ xuất hiện sau khi được đội vận hành QTS nhập hoặc đồng bộ.',
    createLabel: 'Thêm tài sản',
    columns: [
      { key: 'name', label: 'Tài sản' }, { key: 'tenantName', label: 'Khách hàng' },
      { key: 'type', label: 'Loại' }, { key: 'criticality', label: 'Quan trọng', format: 'status' },
      { key: 'healthStatus', label: 'Sức khỏe', format: 'status' }, { key: 'lastSeenAt', label: 'Ghi nhận cuối', format: 'datetime' },
    ],
    fields: [
      { name: 'name', label: 'Tên tài sản', required: true },
      { name: 'type', label: 'Loại tài sản', type: 'select', required: true, createOnly: true, options: [
        { value: 'SERVER', label: 'Máy chủ' }, { value: 'ENDPOINT', label: 'Endpoint' },
        { value: 'NETWORK', label: 'Thiết bị mạng' }, { value: 'CLOUD', label: 'Cloud' },
        { value: 'APPLICATION', label: 'Ứng dụng' }, { value: 'SECURITY_DEVICE', label: 'Thiết bị bảo mật' },
        { value: 'OTHER', label: 'Khác' },
      ] },
      { name: 'vendor', label: 'Nhà cung cấp' }, { name: 'identifier', label: 'Định danh kỹ thuật' },
      { name: 'status', label: 'Vòng đời', type: 'select', options: [
        { value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'MAINTENANCE', label: 'Bảo trì' },
        { value: 'RETIRED', label: 'Ngừng sử dụng' },
      ] },
      { name: 'criticality', label: 'Mức quan trọng', type: 'select', options: severity },
      { name: 'healthStatus', label: 'Sức khỏe', type: 'select', options: [
        { value: 'HEALTHY', label: 'Tốt' }, { value: 'DEGRADED', label: 'Suy giảm' },
        { value: 'DOWN', label: 'Mất kết nối' }, { value: 'UNKNOWN', label: 'Chưa xác định' },
      ] },
      { name: 'owner', label: 'Đơn vị phụ trách' },
      { name: 'lastSeenAt', label: 'Ghi nhận cuối', type: 'datetime-local' },
    ],
    defaultValues: { status: 'ACTIVE', criticality: 'MEDIUM', healthStatus: 'UNKNOWN' },
  },
  licenses: {
    resource: 'licenses', eyebrow: 'Hồ sơ dịch vụ · License', title: 'License dịch vụ',
    description: 'Theo dõi số lượng đã cấp, mức sử dụng, nhà cung cấp và thời hạn của từng license.',
    emptyTitle: 'Chưa có giấy phép', emptyDescription: 'Chưa có giấy phép nào được gắn với phạm vi hiện tại.',
    createLabel: 'Thêm giấy phép',
    columns: [
      { key: 'productName', label: 'Sản phẩm' }, { key: 'tenantName', label: 'Khách hàng' },
      { key: 'vendor', label: 'Nhà cung cấp' }, { key: 'usedQuantity', label: 'Đã dùng' },
      { key: 'quantity', label: 'Tổng số' }, { key: 'expiresAt', label: 'Hết hạn', format: 'date' },
      { key: 'status', label: 'Trạng thái', format: 'status' },
    ],
    fields: [
      { name: 'productName', label: 'Tên sản phẩm', required: true }, { name: 'vendor', label: 'Nhà cung cấp' },
      { name: 'licenseReference', label: 'Mã giấy phép' },
      { name: 'quantity', label: 'Số lượng', type: 'number', min: 1, required: true },
      { name: 'usedQuantity', label: 'Đã dùng', type: 'number', min: 0, required: true },
      { name: 'startsAt', label: 'Ngày bắt đầu', type: 'date' }, { name: 'expiresAt', label: 'Ngày hết hạn', type: 'date' },
      { name: 'status', label: 'Trạng thái', type: 'select', options: [
        { value: 'ACTIVE', label: 'Đang hiệu lực' }, { value: 'EXPIRING', label: 'Sắp hết hạn' },
        { value: 'EXPIRED', label: 'Đã hết hạn' }, { value: 'SUSPENDED', label: 'Tạm ngưng' },
      ] },
    ],
    defaultValues: { usedQuantity: '0', status: 'ACTIVE' },
  },
  tenants: {
    resource: 'tenants', eyebrow: 'Khách hàng · Tenant', title: 'Hồ sơ khách hàng',
    description: 'Quản lý phạm vi vận hành, gói dịch vụ, liên hệ khẩn cấp và chính sách SLA của từng tenant.',
    emptyTitle: 'Chưa có tenant', emptyDescription: 'Tạo tenant trước khi cấp tài sản, cảnh báo hoặc tài khoản khách hàng.',
    createLabel: 'Tạo tenant',
    columns: [
      { key: 'name', label: 'Khách hàng' }, { key: 'id', label: 'Tenant ID' },
      { key: 'serviceTier', label: 'Gói dịch vụ' }, { key: 'status', label: 'Trạng thái', format: 'status' },
      { key: 'emergencyContactEmail', label: 'Liên hệ khẩn cấp' }, { key: 'updatedAt', label: 'Cập nhật', format: 'datetime' },
    ],
    fields: [
      { name: 'id', label: 'Tenant ID', required: true, createOnly: true }, { name: 'name', label: 'Tên khách hàng', required: true },
      { name: 'status', label: 'Trạng thái', type: 'select', options: [
        { value: 'ACTIVE', label: 'Hoạt động' }, { value: 'SUSPENDED', label: 'Tạm ngưng' }, { value: 'ARCHIVED', label: 'Lưu trữ' },
      ] },
      { name: 'serviceTier', label: 'Gói dịch vụ' }, { name: 'emergencyContactName', label: 'Người liên hệ khẩn cấp' },
      { name: 'emergencyContactEmail', label: 'Email khẩn cấp', type: 'email' }, { name: 'emergencyContactPhone', label: 'Điện thoại khẩn cấp' },
      { name: 'slaCriticalMinutes', label: 'SLA Critical (phút)', type: 'number', min: 1 },
      { name: 'slaHighMinutes', label: 'SLA High (phút)', type: 'number', min: 1 },
      { name: 'slaMediumMinutes', label: 'SLA Medium (phút)', type: 'number', min: 1 },
      { name: 'slaLowMinutes', label: 'SLA Low (phút)', type: 'number', min: 1 },
      { name: 'notes', label: 'Ghi chú vận hành', type: 'textarea', wide: true },
    ],
    defaultValues: { status: 'ACTIVE' },
  },
  contracts: {
    resource: 'contracts', eyebrow: 'Hồ sơ dịch vụ · Hợp đồng', title: 'Hợp đồng dịch vụ',
    description: 'Theo dõi phạm vi, hiệu lực, giá trị và ngày gia hạn của hợp đồng trong tổ chức hiện tại.',
    emptyTitle: 'Chưa có hợp đồng', emptyDescription: 'Chưa có hợp đồng nào trong phạm vi hiện tại.',
    createLabel: 'Thêm hợp đồng',
    columns: [
      { key: 'contractNumber', label: 'Số hợp đồng' }, { key: 'title', label: 'Tên hợp đồng' },
      { key: 'tenantName', label: 'Khách hàng' }, { key: 'status', label: 'Trạng thái', format: 'status' },
      { key: 'totalAmount', label: 'Giá trị', format: 'money' }, { key: 'expiresAt', label: 'Hết hạn', format: 'date' },
    ],
    fields: [
      { name: 'contractNumber', label: 'Số hợp đồng', required: true, createOnly: true }, { name: 'title', label: 'Tên hợp đồng', required: true },
      { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: [
        { value: 'DRAFT', label: 'Nháp' }, { value: 'ACTIVE', label: 'Hiệu lực' },
        { value: 'EXPIRED', label: 'Hết hạn' }, { value: 'TERMINATED', label: 'Chấm dứt' },
      ] },
      { name: 'startsAt', label: 'Ngày bắt đầu', type: 'date', required: true, createOnly: true },
      { name: 'expiresAt', label: 'Ngày hết hạn', type: 'date' }, { name: 'currency', label: 'Tiền tệ', required: true },
      { name: 'totalAmount', label: 'Tổng giá trị', type: 'number', min: 0, step: 1 },
    ],
    defaultValues: { status: 'ACTIVE', currency: 'VND' },
  },
  invoices: {
    resource: 'invoices', eyebrow: 'Hồ sơ dịch vụ · Tài chính', title: 'Hóa đơn',
    description: 'Theo dõi số tiền, trạng thái phát hành, ngày đến hạn và thanh toán của từng hóa đơn.',
    emptyTitle: 'Chưa có hóa đơn', emptyDescription: 'Chưa có hóa đơn nào trong phạm vi hiện tại.',
    createLabel: 'Tạo hóa đơn',
    columns: [
      { key: 'invoiceNumber', label: 'Số hóa đơn' }, { key: 'tenantName', label: 'Khách hàng' },
      { key: 'amount', label: 'Số tiền', format: 'money' }, { key: 'status', label: 'Trạng thái', format: 'status' },
      { key: 'issuedAt', label: 'Phát hành', format: 'date' }, { key: 'dueAt', label: 'Đến hạn', format: 'date' },
    ],
    fields: [
      { name: 'contractId', label: 'ID hợp đồng', createOnly: true }, { name: 'invoiceNumber', label: 'Số hóa đơn', required: true, createOnly: true },
      { name: 'amount', label: 'Số tiền', type: 'number', min: 0, step: 1, required: true, createOnly: true },
      { name: 'currency', label: 'Tiền tệ', required: true, createOnly: true },
      { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: [
        { value: 'DRAFT', label: 'Nháp' }, { value: 'ISSUED', label: 'Đã phát hành' },
        { value: 'PAID', label: 'Đã thanh toán' }, { value: 'OVERDUE', label: 'Quá hạn' }, { value: 'VOID', label: 'Đã hủy' },
      ] },
      { name: 'issuedAt', label: 'Ngày phát hành', type: 'date' }, { name: 'dueAt', label: 'Ngày đến hạn', type: 'date' },
    ],
    defaultValues: { status: 'DRAFT', currency: 'VND' },
  },
  documents: {
    resource: 'documents', eyebrow: 'Hồ sơ dịch vụ · Tài liệu', title: 'Tài liệu dịch vụ',
    description: 'Tập trung báo cáo, biên bản, tài liệu bàn giao và tệp thương mại được cấp theo quyền.',
    emptyTitle: 'Chưa có tài liệu', emptyDescription: 'Chưa có tài liệu nào được phát hành cho phạm vi hiện tại.',
    createLabel: 'Tải tài liệu lên', columns: [], fields: [],
  },
  knowledge: {
    resource: 'knowledge', eyebrow: 'Hồ sơ dịch vụ · Tri thức', title: 'Tri thức vận hành',
    description: 'Tra cứu quy trình xử lý, hướng dẫn sử dụng và cập nhật vận hành đã được phê duyệt.',
    emptyTitle: 'Chưa có bài viết', emptyDescription: 'Chưa có nội dung tri thức phù hợp với quyền hiện tại.',
    createLabel: 'Soạn bài viết',
    columns: [
      { key: 'title', label: 'Bài viết' }, { key: 'category', label: 'Danh mục' },
      { key: 'audience', label: 'Đối tượng', format: 'status' }, { key: 'status', label: 'Trạng thái', format: 'status' },
      { key: 'publishedAt', label: 'Xuất bản', format: 'datetime' },
    ],
    fields: [
      { name: 'title', label: 'Tiêu đề', required: true }, { name: 'category', label: 'Danh mục', required: true },
      { name: 'summary', label: 'Tóm tắt', type: 'textarea', required: true, wide: true },
      { name: 'body', label: 'Nội dung', type: 'textarea', required: true, wide: true },
      { name: 'audience', label: 'Đối tượng', type: 'select', options: [
        { value: 'CLIENT', label: 'Khách hàng' }, { value: 'INTERNAL', label: 'Nội bộ' }, { value: 'ALL', label: 'Tất cả' },
      ] },
      { name: 'status', label: 'Trạng thái', type: 'select', options: [
        { value: 'DRAFT', label: 'Nháp' }, { value: 'PUBLISHED', label: 'Xuất bản' }, { value: 'ARCHIVED', label: 'Lưu trữ' },
      ] },
    ],
    defaultValues: { audience: 'CLIENT', status: 'DRAFT' },
  },
  integrations: {
    resource: 'integrations', eyebrow: 'Nền tảng · Tích hợp', title: 'Tích hợp hệ thống',
    description: 'Kết nối SIEM, SOAR, EDR và webhook; secret được mã hóa phía backend và không bao giờ trả về UI.',
    emptyTitle: 'Chưa có tích hợp', emptyDescription: 'Chưa cấu hình endpoint tích hợp cho phạm vi hiện tại.',
    createLabel: 'Thêm tích hợp',
    columns: [
      { key: 'name', label: 'Tích hợp' }, { key: 'tenantName', label: 'Khách hàng' },
      { key: 'type', label: 'Loại' }, { key: 'status', label: 'Trạng thái', format: 'status' },
      { key: 'endpointUrl', label: 'Endpoint' }, { key: 'lastCheckedAt', label: 'Kiểm tra cuối', format: 'datetime' },
    ],
    fields: [
      { name: 'name', label: 'Tên tích hợp', required: true },
      { name: 'type', label: 'Loại', type: 'select', required: true, createOnly: true, options: [
        { value: 'SIEM', label: 'SIEM' }, { value: 'SOAR', label: 'SOAR' }, { value: 'EDR', label: 'EDR' },
        { value: 'WEBHOOK', label: 'Webhook' }, { value: 'OTHER', label: 'Khác' },
      ] },
      { name: 'endpointUrl', label: 'Endpoint HTTPS', type: 'url', required: true },
      { name: 'secret', label: 'Secret (tối thiểu 16 ký tự)', type: 'password' },
      { name: 'status', label: 'Trạng thái', type: 'select', updateOnly: true, options: [
        { value: 'CONFIGURED', label: 'Đã cấu hình' }, { value: 'ACTIVE', label: 'Hoạt động' },
        { value: 'DEGRADED', label: 'Suy giảm' }, { value: 'DISABLED', label: 'Vô hiệu' },
      ] },
    ],
  },
  shifts: {
    resource: 'shifts', eyebrow: 'Vận hành nội bộ · SOC', title: 'Ca trực SOC',
    description: 'Lịch trực, cấp xử lý và ghi chú bàn giao phục vụ vận hành 24/7.',
    emptyTitle: 'Chưa có ca trực', emptyDescription: 'Chưa lập lịch ca trực cho phạm vi đang chọn.',
    createLabel: 'Lập ca trực',
    columns: [
      { key: 'engineerName', label: 'Kỹ sư' }, { key: 'level', label: 'Cấp' },
      { key: 'startsAt', label: 'Bắt đầu', format: 'datetime' }, { key: 'endsAt', label: 'Kết thúc', format: 'datetime' },
      { key: 'status', label: 'Trạng thái', format: 'status' },
    ],
    fields: [
      { name: 'engineerName', label: 'Tên kỹ sư', required: true },
      { name: 'level', label: 'Cấp trực', type: 'select', required: true, createOnly: true, options: [
        { value: 'L1', label: 'L1' }, { value: 'L2', label: 'L2' }, { value: 'L3', label: 'L3' }, { value: 'MANAGER', label: 'Manager' },
      ] },
      { name: 'startsAt', label: 'Bắt đầu', type: 'datetime-local', required: true },
      { name: 'endsAt', label: 'Kết thúc', type: 'datetime-local', required: true },
      { name: 'handoverNotes', label: 'Ghi chú bàn giao', type: 'textarea', wide: true },
      { name: 'status', label: 'Trạng thái', type: 'select', options: [
        { value: 'SCHEDULED', label: 'Đã lên lịch' }, { value: 'ACTIVE', label: 'Đang trực' },
        { value: 'COMPLETED', label: 'Hoàn thành' }, { value: 'CANCELLED', label: 'Đã hủy' },
      ] },
    ],
    defaultValues: { status: 'SCHEDULED' },
  },
};
