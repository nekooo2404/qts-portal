import type { SearchEntry } from './lib/search';

export type SecurityNode = {
  id: string;
  label: string;
  shortLabel: string;
  summary: string;
  detail: string;
};

export type Service = {
  id: string;
  title: string;
  description: string;
  deliverable: string;
  startingPoint: string;
  keywords: string[];
};

export type Resource = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  keywords: string[];
};

export const securityNodes: SecurityNode[] = [
  {
    id: 'attack-surface',
    label: 'Bề mặt tấn công',
    shortLabel: 'Bề mặt',
    summary: 'Nhìn thấy tài sản public trước khi người tấn công nhìn thấy chúng.',
    detail: 'Lập bản đồ tên miền, địa chỉ IP, dịch vụ công khai và điểm vào cần được xác minh.',
  },
  {
    id: 'identity',
    label: 'Danh tính & truy cập',
    shortLabel: 'Danh tính',
    summary: 'Thu hẹp quyền truy cập và đường đi tới tài sản quan trọng.',
    detail: 'Rà soát tài khoản đặc quyền, luồng xác thực, phân quyền và các quan hệ tin cậy.',
  },
  {
    id: 'application',
    label: 'Ứng dụng & API',
    shortLabel: 'Ứng dụng',
    summary: 'Kiểm tra cách ứng dụng xử lý dữ liệu, phiên và quyền hạn.',
    detail: 'Đánh giá web, mobile, API và logic nghiệp vụ bằng phương pháp có kiểm soát.',
  },
  {
    id: 'cloud',
    label: 'Hạ tầng & cloud',
    shortLabel: 'Hạ tầng',
    summary: 'Đối chiếu cấu hình thực tế với mô hình vận hành dự kiến.',
    detail: 'Tập trung vào cấu hình mạng, workload, bí mật, log và ranh giới giữa các môi trường.',
  },
  {
    id: 'response',
    label: 'Ứng phó sự cố',
    shortLabel: 'Ứng phó',
    summary: 'Khoanh vùng, phục hồi và rút kinh nghiệm từ sự cố.',
    detail: 'Chuẩn bị playbook, bảo toàn bằng chứng và phối hợp hành động khi tín hiệu trở thành sự cố.',
  },
];

export const services: Service[] = [
  {
    id: 'assessment',
    title: 'Đánh giá bề mặt tấn công',
    description: 'Xác định tài sản public, dịch vụ lộ diện và đường tấn công cần ưu tiên.',
    deliverable: 'Bản đồ tài sản, bằng chứng kỹ thuật và thứ tự xử lý.',
    startingPoint: 'Tên miền, dải IP hoặc phạm vi hệ thống.',
    keywords: ['attack surface', 'asm', 'tai san', 'danh gia'],
  },
  {
    id: 'pentest',
    title: 'Kiểm thử xâm nhập',
    description: 'Kiểm tra web, mobile, API và hạ tầng trong phạm vi đã thống nhất.',
    deliverable: 'Kịch bản khai thác, mức ảnh hưởng và hướng khắc phục.',
    startingPoint: 'Ứng dụng hoặc môi trường sắp phát hành.',
    keywords: ['pentest', 'kiem thu', 'web', 'api', 'mobile'],
  },
  {
    id: 'vulnerability',
    title: 'Quản trị lỗ hổng',
    description: 'Biến danh sách phát hiện thành luồng xác minh, giao việc và kiểm tra lại.',
    deliverable: 'Backlog đã ưu tiên và trạng thái kiểm chứng sau khắc phục.',
    startingPoint: 'Kết quả scan hoặc báo cáo tồn đọng.',
    keywords: ['lo hong', 'vulnerability', 'remediation'],
  },
  {
    id: 'identity-cloud',
    title: 'Rà soát cloud & danh tính',
    description: 'Rà soát cấu hình cloud, đặc quyền, bí mật và đường đi giữa các vùng tin cậy.',
    deliverable: 'Sơ đồ quyền, sai lệch cấu hình và kế hoạch giảm quyền.',
    startingPoint: 'Tài khoản cloud hoặc mô hình IAM hiện tại.',
    keywords: ['cloud', 'iam', 'identity', 'quyen truy cap'],
  },
  {
    id: 'incident-response',
    title: 'Giám sát & ứng phó sự cố',
    description: 'Chuẩn bị quy trình và hỗ trợ phân tích khi có dấu hiệu xâm nhập.',
    deliverable: 'Timeline, phạm vi ảnh hưởng và hành động phục hồi.',
    startingPoint: 'Tín hiệu bất thường hoặc nhu cầu diễn tập.',
    keywords: ['incident', 'ir', 'soc', 'ung pho', 'giam sat'],
  },
  {
    id: 'architecture',
    title: 'Kiến trúc & tuân thủ',
    description: 'Đưa yêu cầu an ninh vào kiến trúc, quy trình và bằng chứng vận hành.',
    deliverable: 'Mô hình kiểm soát, khoảng trống và lộ trình triển khai.',
    startingPoint: 'Kiến trúc mới hoặc yêu cầu kiểm toán.',
    keywords: ['architecture', 'compliance', 'kien truc', 'tuan thu'],
  },
];

export const operatingSteps = [
  {
    number: '1.0',
    title: 'Quan sát',
    description: 'Xác định tài sản, luồng dữ liệu và tín hiệu đang có.',
  },
  {
    number: '2.0',
    title: 'Xác minh',
    description: 'Kiểm tra khả năng khai thác và tác động trong ngữ cảnh thực.',
  },
  {
    number: '3.0',
    title: 'Khắc phục',
    description: 'Gắn phát hiện với chủ sở hữu, thay đổi và kiểm tra lại.',
  },
  {
    number: '4.0',
    title: 'Ứng phó',
    description: 'Khoanh vùng, phục hồi và cập nhật kiểm soát sau sự cố.',
  },
];

export const resources: Resource[] = [
  {
    id: 'pentest-readiness',
    title: 'Chuẩn bị phạm vi pentest',
    summary: 'Chốt tài sản, môi trường, tài khoản thử nghiệm và quy tắc phối hợp.',
    detail: 'Một phạm vi rõ giúp đội kiểm thử tập trung vào rủi ro nghiệp vụ thay vì mất thời gian xác minh quyền truy cập và đầu mối xử lý.',
    keywords: ['pentest', 'scope', 'pham vi', 'checklist'],
  },
  {
    id: 'incident-playbook',
    title: 'Khung playbook sự cố',
    summary: 'Xác định người quyết định, kênh liên lạc, bằng chứng và điểm chuyển trạng thái.',
    detail: 'Playbook nên gắn với hệ thống thực tế, người chịu trách nhiệm và điều kiện kích hoạt thay vì chỉ là một tài liệu tổng quát.',
    keywords: ['incident', 'playbook', 'ung pho', 'forensics'],
  },
  {
    id: 'least-privilege',
    title: 'Rà soát quyền tối thiểu',
    summary: 'Bắt đầu từ tài sản quan trọng, sau đó lần ngược người, vai trò và quan hệ tin cậy.',
    detail: 'Mục tiêu là loại quyền không còn lý do vận hành, tách đường quản trị và giữ lại bằng chứng cho mỗi ngoại lệ.',
    keywords: ['iam', 'identity', 'least privilege', 'phan quyen'],
  },
];

export const serviceMenuGroups = [
  { title: 'Đánh giá', serviceIds: ['assessment', 'pentest'] },
  { title: 'Vận hành', serviceIds: ['vulnerability', 'incident-response'] },
  { title: 'Kiến trúc', serviceIds: ['identity-cloud', 'architecture'] },
];

export const searchEntries: SearchEntry[] = [
  ...services.map((service) => ({
    id: service.id,
    title: service.title,
    description: service.description,
    keywords: service.keywords,
    href: `#service-${service.id}`,
    category: 'Năng lực',
  })),
  ...resources.map((resource) => ({
    id: resource.id,
    title: resource.title,
    description: resource.summary,
    keywords: resource.keywords,
    href: `#resource-${resource.id}`,
    category: 'Tài nguyên',
  })),
];
