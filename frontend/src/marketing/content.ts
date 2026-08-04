import { SITE_NAME, siteUrl } from './site';

export type MarketingLink = {
  href: string;
  label: string;
  description?: string;
};

export type ServiceInterest =
  | 'website-design'
  | 'software-development'
  | 'digital-transformation'
  | 'online-advertising'
  | 'digital-marketing'
  | 'it-solutions';

export interface Service {
  slug: string;
  title: string;
  summary: string;
  serviceInterest: ServiceInterest;
  problem: string;
  solution: string;
  benefit: string;
  implementation: string;
  outcome: string;
  duration: string;
  fit: string;
  scope: string[];
  deliverables: string[];
  technologies: string[];
  faq: Array<{ question: string; answer: string }>;
}

export interface PlaceholderProject {
  slug: string;
  title: string;
  client: '[TÊN KHÁCH HÀNG]';
  industry: '[NGÀNH NGHỀ]';
  challenge: '[VẤN ĐỀ]';
  solution: '[GIẢI PHÁP]';
  result: '[KẾT QUẢ]';
  image: '[HÌNH ẢNH DỰ ÁN]';
  isPlaceholder: true;
  metric: '[KẾT QUẢ]';
  architecture: string[];
}

export type CaseStudy = PlaceholderProject;

export interface PlaceholderArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedLabel: string;
  isPlaceholder: true;
  summary: string;
  readTime: string;
  updatedAt: string;
}

export interface Solution {
  slug: string;
  title: string;
  summary: string;
  audience: string;
  outcomes: string[];
  relatedServices: ServiceInterest[];
  challenge: string;
  modules: string[];
}

export const primaryNavigation = [
  { href: '/', label: 'Trang chủ', description: 'Tổng quan hệ sinh thái QTS Việt Nam' },
  { href: '/gioi-thieu', label: 'Giới thiệu', description: 'Năng lực, cách làm việc và định hướng của QTS Việt Nam' },
  { href: '/dich-vu', label: 'Dịch vụ', description: 'Các nhóm dịch vụ công nghệ QTS Việt Nam triển khai' },
  { href: '/giai-phap', label: 'Giải pháp', description: 'Giải pháp theo nhu cầu kinh doanh' },
  { href: '/du-an', label: 'Dự án', description: 'Hồ sơ dự án và case study đang chờ dữ liệu xác minh' },
  { href: '/tin-tuc', label: 'Tin tức', description: 'Bài viết và cập nhật đang chờ dữ liệu xác minh' },
  { href: '/lien-he', label: 'Liên hệ', description: 'Biểu mẫu tư vấn và thông tin liên hệ' },
] as const satisfies MarketingLink[];

export const serviceMenu = [
  { href: '/dich-vu/thiet-ke-website', label: 'Thiết kế website', description: 'Thiết kế website doanh nghiệp theo mục tiêu kinh doanh.' },
  { href: '/dich-vu/phat-trien-phan-mem', label: 'Phát triển phần mềm', description: 'Phát triển phần mềm theo quy trình vận hành thực tế.' },
  { href: '/dich-vu/tu-van-chuyen-doi-so', label: 'Tư vấn chuyển đổi số', description: 'Tư vấn lộ trình và ưu tiên chuyển đổi số.' },
  { href: '/dich-vu/quang-cao-truc-tuyen', label: 'Quảng cáo trực tuyến', description: 'Triển khai và đo lường quảng cáo trực tuyến.' },
  { href: '/dich-vu/digital-marketing', label: 'Digital Marketing', description: 'Xây dựng nội dung, kênh và đo lường marketing số.' },
  { href: '/dich-vu/giai-phap-cong-nghe-thong-tin', label: 'Giải pháp công nghệ thông tin', description: 'Tư vấn và triển khai giải pháp công nghệ thông tin.' },
] as const satisfies MarketingLink[];

export const solutionMenu = [
  { href: '/giai-phap/ban-le', label: 'Bán lẻ đa kênh', description: 'Đồng bộ bán hàng, tài sản số và chiến dịch.' },
  { href: '/giai-phap/giao-duc', label: 'Giáo dục', description: 'Cổng học tập, tuyển sinh và hỗ trợ tập trung.' },
  { href: '/giai-phap/bat-dong-san', label: 'Bất động sản', description: 'Quản lý lead, dự án và nội dung bán hàng.' },
  { href: '/giai-phap/logistics', label: 'Logistics', description: 'Theo dõi vận hành, tích hợp và cảnh báo.' },
  { href: '/giai-phap/san-xuat', label: 'Sản xuất', description: 'Số hóa quy trình, tài sản và bảo trì.' },
  { href: '/giai-phap/dich-vu', label: 'Doanh nghiệp dịch vụ', description: 'CRM, dự án, hợp đồng và chăm sóc khách hàng.' },
] as const satisfies MarketingLink[];

const serviceDetails: Array<Omit<Service, 'slug' | 'title' | 'serviceInterest'>> = [
  {
    summary: 'Thiết kế và triển khai website doanh nghiệp có định hướng chuyển đổi rõ ràng.',
    problem: 'Doanh nghiệp cần một hiện diện số rõ ràng, nhanh và đáng tin cậy.',
    solution: 'QTS Việt Nam thiết kế website theo mục tiêu kinh doanh và hành trình người dùng.',
    benefit: 'Thông điệp, năng lực và kênh liên hệ được trình bày rõ trong một trải nghiệm gọn.',
    implementation: 'Khảo sát, kiến trúc thông tin, giao diện, nội dung và triển khai bàn giao.',
    outcome: 'Một kênh số có cấu trúc nội dung rõ ràng và có thể vận hành lâu dài.',
    duration: 'Theo phạm vi được xác nhận',
    fit: 'Doanh nghiệp cần xây mới hoặc nâng cấp website.',
    scope: ['Khảo sát mục tiêu', 'Kiến trúc thông tin', 'Thiết kế giao diện', 'Phát triển và kiểm thử', 'Bàn giao vận hành'],
    deliverables: ['Thiết kế giao diện', 'Website production', 'Tài liệu quản trị', 'Báo cáo kiểm thử'],
    technologies: ['Next.js', 'React', 'TypeScript', 'CMS'],
    faq: [{ question: 'Website có thể kết nối hệ thống hiện tại không?', answer: 'QTS khảo sát API, cơ chế xác thực và luồng dữ liệu trước khi cam kết phạm vi tích hợp.' }],
  },
  {
    summary: 'Thiết kế và xây dựng phần mềm theo bài toán vận hành thực tế của doanh nghiệp.',
    problem: 'Quy trình thủ công hoặc hệ thống rời rạc làm chậm công việc hằng ngày.',
    solution: 'QTS Việt Nam phân tích nghiệp vụ, thiết kế luồng dữ liệu và phát triển phần mềm phù hợp.',
    benefit: 'Giảm thao tác lặp lại và tăng khả năng kiểm soát tiến độ công việc.',
    implementation: 'Khảo sát nghiệp vụ, thiết kế, phát triển, kiểm thử và chuyển giao vận hành.',
    outcome: 'Quy trình được số hóa có kiểm soát, dữ liệu tập trung và quyền truy cập rõ ràng.',
    duration: 'Theo phạm vi và milestone được xác nhận',
    fit: 'Tổ chức có quy trình đặc thù hoặc cần thay thế hệ thống rời rạc.',
    scope: ['Khảo sát nghiệp vụ', 'Thiết kế kiến trúc dữ liệu', 'Phát triển theo milestone', 'Kiểm thử và UAT', 'Chuyển giao'],
    deliverables: ['Tài liệu yêu cầu', 'Mã nguồn và pipeline', 'Tài liệu API', 'Kịch bản kiểm thử'],
    technologies: ['Next.js', 'Node.js', 'PostgreSQL', 'OpenAPI'],
    faq: [{ question: 'Quyền sở hữu mã nguồn được xác định thế nào?', answer: 'Quyền sở hữu và phạm vi bàn giao được ghi rõ trong hợp đồng của từng dự án.' }],
  },
  {
    summary: 'Định hướng lộ trình và ưu tiên chuyển đổi số theo bối cảnh vận hành của doanh nghiệp.',
    problem: 'Doanh nghiệp cần xác định đúng ưu tiên trước khi đầu tư vào công nghệ.',
    solution: 'QTS Việt Nam cùng doanh nghiệp làm rõ mục tiêu, quy trình, dữ liệu và lộ trình thực hiện.',
    benefit: 'Các quyết định đầu tư được gắn với vấn đề cụ thể và tiêu chí nghiệm thu.',
    implementation: 'Khảo sát hiện trạng, phân tích khoảng cách, đề xuất lộ trình và kế hoạch ưu tiên.',
    outcome: 'Một lộ trình chuyển đổi số có phạm vi, ưu tiên và bước triển khai rõ ràng.',
    duration: 'Theo phạm vi khảo sát',
    fit: 'Doanh nghiệp đang xác định lộ trình số hóa.',
    scope: ['Khảo sát hiện trạng', 'Phân tích quy trình', 'Xác định ưu tiên', 'Đề xuất lộ trình'],
    deliverables: ['Bản đồ hiện trạng', 'Danh sách ưu tiên', 'Lộ trình đề xuất', 'Tiêu chí đánh giá'],
    technologies: ['Business analysis', 'Data mapping', 'Architecture review'],
    faq: [{ question: 'Kết quả tư vấn có bắt buộc dùng công nghệ cụ thể không?', answer: 'Không. Đề xuất được xây dựng từ mục tiêu, hiện trạng và năng lực vận hành đã xác nhận.' }],
  },
  {
    summary: 'Triển khai và đo lường quảng cáo trực tuyến theo mục tiêu đã thống nhất.',
    problem: 'Chiến dịch quảng cáo cần một cách đo lường và đối soát rõ ràng.',
    solution: 'QTS Việt Nam cấu hình kênh, thông điệp và đo lường theo phạm vi được phê duyệt.',
    benefit: 'Doanh nghiệp có cơ sở rõ hơn để theo dõi và điều chỉnh chiến dịch.',
    implementation: 'Xác định mục tiêu, cấu hình đo lường, triển khai, theo dõi và báo cáo.',
    outcome: 'Hoạt động quảng cáo được theo dõi theo cùng một định nghĩa dữ liệu.',
    duration: 'Theo chu kỳ chiến dịch',
    fit: 'Doanh nghiệp cần triển khai hoặc rà soát quảng cáo trực tuyến.',
    scope: ['Xác định mục tiêu', 'Cấu hình đo lường', 'Thiết lập chiến dịch', 'Theo dõi và báo cáo'],
    deliverables: ['Kế hoạch kênh', 'Cấu hình đo lường', 'Báo cáo chiến dịch'],
    technologies: ['Google Ads', 'Meta Ads', 'Analytics'],
    faq: [{ question: 'Ngân sách media có nằm trong phí dịch vụ không?', answer: 'Không mặc định. Ngân sách media và phí vận hành được tách rõ trong đề xuất.' }],
  },
  {
    summary: 'Xây dựng nội dung, kênh và hoạt động marketing số theo mục tiêu kinh doanh.',
    problem: 'Doanh nghiệp cần kết nối nội dung, kênh và dữ liệu đo lường trong một kế hoạch thống nhất.',
    solution: 'QTS Việt Nam hỗ trợ lập kế hoạch, triển khai và cải tiến hoạt động marketing số theo phạm vi.',
    benefit: 'Các hoạt động marketing có mục tiêu, người phụ trách và cách đánh giá rõ hơn.',
    implementation: 'Khảo sát mục tiêu, lập kế hoạch, triển khai nội dung và theo dõi kết quả.',
    outcome: 'Kênh và nội dung được vận hành theo mục tiêu đã thống nhất.',
    duration: 'Theo chu kỳ được xác nhận',
    fit: 'Doanh nghiệp cần một kế hoạch marketing số có cấu trúc.',
    scope: ['Khảo sát mục tiêu', 'Lập kế hoạch kênh', 'Triển khai nội dung', 'Báo cáo và cải tiến'],
    deliverables: ['Kế hoạch marketing', 'Lịch nội dung', 'Cấu hình đo lường', 'Báo cáo định kỳ'],
    technologies: ['Analytics', 'SEO', 'Content operations'],
    faq: [{ question: 'Bộ chỉ số báo cáo được xác định thế nào?', answer: 'Bộ chỉ số được chốt theo mục tiêu kinh doanh và phạm vi đo lường đã thống nhất.' }],
  },
  {
    summary: 'Tư vấn và triển khai giải pháp công nghệ thông tin phù hợp với hệ thống hiện tại.',
    problem: 'Hệ thống công nghệ cần được kết nối, kiểm soát và vận hành theo một bối cảnh chung.',
    solution: 'QTS Việt Nam khảo sát hiện trạng, thiết kế giải pháp và hỗ trợ triển khai theo ưu tiên.',
    benefit: 'Doanh nghiệp có cấu trúc giải pháp phù hợp hơn với năng lực và mục tiêu vận hành.',
    implementation: 'Khảo sát, thiết kế giải pháp, triển khai, kiểm thử và chuyển giao.',
    outcome: 'Các thành phần công nghệ được tổ chức theo phạm vi và trách nhiệm rõ ràng.',
    duration: 'Theo phạm vi được xác nhận',
    fit: 'Doanh nghiệp cần tư vấn hoặc triển khai hệ thống công nghệ thông tin.',
    scope: ['Khảo sát hiện trạng', 'Thiết kế giải pháp', 'Tích hợp hệ thống', 'Kiểm thử và chuyển giao'],
    deliverables: ['Tài liệu giải pháp', 'Sơ đồ tích hợp', 'Kế hoạch triển khai', 'Tài liệu vận hành'],
    technologies: ['Cloud', 'API', 'Security review', 'Monitoring'],
    faq: [{ question: 'Có thể làm việc với hệ thống sẵn có không?', answer: 'Có, sau khi khảo sát cấu hình, quyền truy cập, dữ liệu và các ràng buộc kỹ thuật.' }],
  },
];

export const services: Service[] = serviceDetails.map((details, index) => ({
  ...details,
  slug: serviceMenu[index].href.split('/').pop() ?? '',
  title: serviceMenu[index].label,
  serviceInterest: (['website-design', 'software-development', 'digital-transformation', 'online-advertising', 'digital-marketing', 'it-solutions'] as ServiceInterest[])[index],
}));

export const solutions: Solution[] = [
  { slug: 'ban-le', title: 'Bán lẻ đa kênh', audience: 'Chuỗi cửa hàng và thương hiệu bán lẻ', challenge: 'Kênh bán hàng, quảng cáo, website và dữ liệu khách hàng thường nằm ở nhiều hệ thống.', summary: 'Kết nối website, dữ liệu khách hàng, chiến dịch và hỗ trợ trong một không gian vận hành.', modules: ['Website', 'Phần mềm', 'Marketing', 'Tài sản số'], outcomes: ['Dữ liệu có bối cảnh chung', 'Theo dõi công việc theo trạng thái'], relatedServices: ['website-design', 'software-development', 'digital-marketing'] },
  { slug: 'giao-duc', title: 'Giáo dục', audience: 'Trường học và trung tâm đào tạo', challenge: 'Tuyển sinh, học tập, nội dung và hỗ trợ người dùng cần một luồng xuyên suốt.', summary: 'Tổ chức cổng thông tin, quy trình hỗ trợ và dữ liệu theo đơn vị.', modules: ['Website', 'Phần mềm', 'Tài liệu', 'Hỗ trợ'], outcomes: ['Quy trình hỗ trợ rõ ràng', 'Nội dung được tổ chức nhất quán'], relatedServices: ['website-design', 'software-development', 'digital-transformation'] },
  { slug: 'bat-dong-san', title: 'Bất động sản', audience: 'Chủ đầu tư và đơn vị phân phối', challenge: 'Lead, nội dung và báo cáo chiến dịch cần được đối soát theo dự án.', summary: 'Tổ chức lead, chiến dịch và tài sản nội dung theo từng dự án.', modules: ['Website', 'Marketing', 'CRM', 'Tài liệu'], outcomes: ['Lead có nguồn rõ ràng', 'Nội dung được kiểm soát phiên bản'], relatedServices: ['website-design', 'online-advertising', 'digital-marketing'] },
  { slug: 'logistics', title: 'Logistics', audience: 'Doanh nghiệp vận tải và chuỗi cung ứng', challenge: 'Tích hợp giữa hệ thống vận hành và đối tác cần khả năng truy vết.', summary: 'Kết nối API, theo dõi vận hành và hỗ trợ theo dịch vụ trọng yếu.', modules: ['Tích hợp', 'Phần mềm', 'Hạ tầng', 'Bảo mật'], outcomes: ['Luồng tích hợp có quan sát', 'Sự cố có timeline'], relatedServices: ['software-development', 'digital-transformation', 'it-solutions'] },
  { slug: 'san-xuat', title: 'Sản xuất', audience: 'Nhà máy và doanh nghiệp sản xuất', challenge: 'Tài sản, lịch bảo trì và thay đổi hệ thống cần owner và lịch sử thống nhất.', summary: 'Số hóa tài sản, yêu cầu bảo trì và phê duyệt thay đổi theo đơn vị.', modules: ['Tài sản số', 'Phần mềm', 'Hỗ trợ', 'Audit'], outcomes: ['Tài sản có owner', 'Thay đổi có phê duyệt'], relatedServices: ['software-development', 'digital-transformation', 'it-solutions'] },
  { slug: 'dich-vu', title: 'Doanh nghiệp dịch vụ', audience: 'Công ty tư vấn và dịch vụ chuyên môn', challenge: 'Bán hàng, hợp đồng, dự án và hỗ trợ khách hàng bị tách rời.', summary: 'Kết nối vòng đời từ cơ hội bán hàng đến triển khai và gia hạn.', modules: ['Website', 'Phần mềm', 'Hợp đồng', 'Hỗ trợ'], outcomes: ['Pipeline rõ trạng thái', 'Yêu cầu hỗ trợ có lịch sử'], relatedServices: ['website-design', 'software-development', 'digital-marketing'] },
];

export const platformFeatures = [
  { id: 'projects', title: 'Quản lý dự án', summary: 'Theo dõi phạm vi, milestone, nghiệm thu và thay đổi trên cùng một timeline.', points: ['Timeline và milestone', 'UAT, nghiệm thu', 'Tệp và trao đổi tập trung'], href: '/dich-vu/phat-trien-phan-mem' },
  { id: 'service-desk', title: 'Service Desk và SLA', summary: 'Biến mọi yêu cầu hỗ trợ thành ticket có mức ảnh hưởng, owner và lịch sử xử lý.', points: ['Ticket đa kênh', 'Phân mức ưu tiên', 'Knowledge base'], href: '/dich-vu/giai-phap-cong-nghe-thong-tin' },
  { id: 'assets', title: 'Tài sản số', summary: 'Quản lý tài sản công nghệ cùng các mốc bàn giao và vận hành.', points: ['Danh mục tập trung', 'Owner và môi trường', 'Tài liệu bàn giao'], href: '/dich-vu/giai-phap-cong-nghe-thong-tin' },
  { id: 'analytics', title: 'Dashboard điều hành', summary: 'Tổng hợp tiến độ, rủi ro và công việc cần xử lý theo quyền truy cập.', points: ['KPI theo tổ chức', 'Cảnh báo ưu tiên', 'Báo cáo có thể xuất'], href: '/giai-phap/dich-vu' },
];

export const processSteps = [
  { number: '01', title: 'Khảo sát nhu cầu', duration: 'Theo phạm vi', output: 'Mục tiêu, hiện trạng và đầu mối được xác nhận.' },
  { number: '02', title: 'Tư vấn giải pháp', duration: 'Theo phạm vi', output: 'Phạm vi, kiến trúc và ưu tiên được đề xuất.' },
  { number: '03', title: 'Lập kế hoạch', duration: 'Theo dự án', output: 'Milestone và tiêu chí nghiệm thu được thống nhất.' },
  { number: '04', title: 'Thiết kế và triển khai', duration: 'Theo dự án', output: 'Phiên bản làm việc được cập nhật theo chu kỳ.' },
  { number: '05', title: 'Nghiệm thu và đào tạo', duration: 'Theo dự án', output: 'UAT, bàn giao và hướng dẫn vận hành.' },
  { number: '06', title: 'Vận hành và cải tiến', duration: 'Liên tục', output: 'SLA, báo cáo và backlog cải tiến.' },
];

export const caseStudies: PlaceholderProject[] = [{
  slug: 'du-an-mau-01',
  title: '[TÊN DỰ ÁN]',
  client: '[TÊN KHÁCH HÀNG]',
  industry: '[NGÀNH NGHỀ]',
  challenge: '[VẤN ĐỀ]',
  solution: '[GIẢI PHÁP]',
  result: '[KẾT QUẢ]',
  image: '[HÌNH ẢNH DỰ ÁN]',
  isPlaceholder: true,
  metric: '[KẾT QUẢ]',
  architecture: ['[GIẢI PHÁP]'],
}];

export const articles: PlaceholderArticle[] = [{
  slug: 'bai-viet-mau-01',
  title: 'Nội dung bài viết đang chờ xác minh',
  excerpt: 'Bản nháp hiển thị để hoàn thiện bố cục, không phải nội dung đã xác minh.',
  category: 'Tin tức',
  publishedLabel: 'Đang chờ ngày xuất bản',
  isPlaceholder: true,
  summary: 'Bản nháp hiển thị để hoàn thiện bố cục, không phải nội dung đã xác minh.',
  readTime: 'Đang chờ xác minh',
  updatedAt: 'Đang chờ ngày xuất bản',
}];

export const pricingPlans = [
  { id: 'start', title: 'Phạm vi khởi đầu', fit: 'Doanh nghiệp bắt đầu số hóa', price: 'Liên hệ', features: ['Khảo sát nhu cầu', 'Quản lý dịch vụ', 'Tài liệu bàn giao'] },
  { id: 'growth', title: 'Phạm vi mở rộng', fit: 'Doanh nghiệp đang tăng trưởng', price: 'Nhận báo giá', recommended: true, features: ['Toàn bộ phạm vi khởi đầu', 'Quản lý dự án', 'Quản lý tài sản số'] },
  { id: 'enterprise', title: 'Phạm vi theo tổ chức', fit: 'Tổ chức cần tích hợp riêng', price: 'Thiết kế theo phạm vi', features: ['Tích hợp theo yêu cầu', 'Phân quyền nâng cao', 'SLA theo hợp đồng'] },
];

export const frequentlyAskedQuestions = [
  { question: 'QTS Việt Nam phù hợp với doanh nghiệp nào?', answer: 'QTS Việt Nam phù hợp với doanh nghiệp cần tư vấn, triển khai hoặc vận hành các hệ thống công nghệ theo phạm vi rõ ràng.' },
  { question: 'Có thể bắt đầu từ một dịch vụ không?', answer: 'Có. Doanh nghiệp có thể bắt đầu từ một dịch vụ cụ thể và mở rộng theo nhu cầu đã xác nhận.' },
  { question: 'QTS có hỗ trợ tích hợp hệ thống hiện tại không?', answer: 'Có, sau khi khảo sát API, quyền truy cập, cấu trúc dữ liệu và yêu cầu đồng bộ.' },
  { question: 'Dữ liệu được bảo vệ như thế nào?', answer: 'Phạm vi phân quyền, phân tách dữ liệu và audit được xác định theo hệ thống và hợp đồng áp dụng.' },
];

export const searchItems = [
  ...services.map((service) => ({ id: `service-${service.slug}`, href: `/dich-vu/${service.slug}`, title: service.title, description: service.summary, category: 'Dịch vụ', keywords: [...service.scope, ...service.technologies] })),
  ...solutions.map((solution) => ({ id: `solution-${solution.slug}`, href: `/giai-phap/${solution.slug}`, title: solution.title, description: solution.summary, category: 'Giải pháp', keywords: [...solution.modules, solution.audience] })),
  ...caseStudies.map((item) => ({ id: `case-${item.slug}`, href: `/du-an/${item.slug}`, title: item.title, description: item.challenge, category: 'Dự án', keywords: [item.industry] })),
  ...articles.map((article) => ({ id: `article-${article.slug}`, href: `/tin-tuc/${article.slug}`, title: article.title, description: article.excerpt, category: 'Tin tức', keywords: [article.category] })),
  { id: 'contact', href: '/lien-he', title: `Liên hệ ${SITE_NAME}`, description: 'Biểu mẫu tư vấn và thông tin liên hệ.', category: 'Liên hệ', keywords: ['tư vấn', 'liên hệ'] },
];

export function getService(slug: string): Service | undefined { return services.find((service) => service.slug === slug); }
export function getSolution(slug: string): Solution | undefined { return solutions.find((solution) => solution.slug === slug); }
export function getProject(slug: string): PlaceholderProject | undefined { return caseStudies.find((project) => project.slug === slug); }
export function getArticle(slug: string): PlaceholderArticle | undefined { return articles.find((article) => article.slug === slug); }
export function getCaseStudy(slug: string): CaseStudy | undefined { return getProject(slug); }

export const publicStructuredData = { url: siteUrl('/'), name: SITE_NAME };
