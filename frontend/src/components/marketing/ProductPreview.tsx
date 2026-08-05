import {
  Activity,
  CircleCheck,
  Clock3,
  FolderKanban,
  Gauge,
  Globe2,
  Headphones,
  ReceiptText,
  Server,
} from 'lucide-react';
import type { CSSProperties } from 'react';

type ProductPreviewProps = {
  variant?: 'overview' | 'projects' | 'tickets' | 'assets' | 'analytics';
  compact?: boolean;
};

const previewCopy = {
  overview: {
    title: 'Tổng quan vận hành',
    context: 'Công ty TNHH Minh họa',
    status: '7 việc cần theo dõi',
  },
  projects: {
    title: 'Dự án website mới',
    context: 'Milestone · UAT',
    status: 'Đúng kế hoạch',
  },
  tickets: {
    title: 'Service Desk',
    context: 'SLA theo mức ảnh hưởng',
    status: '2 ticket ưu tiên',
  },
  assets: {
    title: 'Tài sản số',
    context: 'Domain · SSL · Cloud',
    status: '3 mốc gia hạn',
  },
  analytics: {
    title: 'Báo cáo điều hành',
    context: 'Dịch vụ · Dự án · SLA',
    status: 'Cập nhật hôm nay',
  },
} as const;

export function ProductPreview({ variant = 'overview', compact = false }: ProductPreviewProps) {
  const copy = previewCopy[variant];

  return (
    <figure
      className="qts-product-preview"
      data-compact={compact}
      data-variant={variant}
      aria-label={`Mô phỏng giao diện QTS One: ${copy.title}`}
    >
      <figcaption>
        <span>Mô phỏng giao diện sản phẩm</span>
        <strong>{copy.title}</strong>
      </figcaption>

      <div className="qts-product-preview__workspace">
        <nav aria-label="Điều hướng mô phỏng">
          <strong>QTS / ONE</strong>
          <span data-active={variant === 'overview'}><Gauge aria-hidden="true" /> Tổng quan</span>
          <span data-active={variant === 'projects'}><FolderKanban aria-hidden="true" /> Dự án</span>
          <span data-active={variant === 'tickets'}><Headphones aria-hidden="true" /> Hỗ trợ</span>
          <span data-active={variant === 'assets'}><Server aria-hidden="true" /> Tài sản</span>
          <span data-active={variant === 'analytics'}><ReceiptText aria-hidden="true" /> Báo cáo</span>
        </nav>

        <section className="qts-product-preview__content">
          <header>
            <div>
              <span>{copy.context}</span>
              <strong>{copy.title}</strong>
            </div>
            <small><CircleCheck aria-hidden="true" /> {copy.status}</small>
          </header>

          <div className="qts-product-preview__metrics">
            <div><span>Dịch vụ hoạt động</span><strong>08</strong><small><Activity aria-hidden="true" /> ổn định</small></div>
            <div><span>Tiến độ dự án</span><strong>72%</strong><small><Clock3 aria-hidden="true" /> UAT tuần này</small></div>
            <div><span>Uptime mục tiêu</span><strong>99,9%</strong><small><Globe2 aria-hidden="true" /> mục tiêu SLA</small></div>
          </div>

          <div className="qts-product-preview__lower">
            <section className="qts-product-preview__chart" aria-label="Uptime bảy ngày, dữ liệu minh họa">
              <header><strong>Độ ổn định dịch vụ</strong><span>7 ngày</span></header>
              <div className="qts-product-preview__bars" aria-hidden="true">
                {[72, 88, 78, 94, 84, 98, 91].map((height, index) => (
                  <i key={index} style={{ '--bar-height': `${height}%` } as CSSProperties} />
                ))}
              </div>
              <small>Dữ liệu minh họa · Không phải số liệu vận hành thật</small>
            </section>

            <section className="qts-product-preview__queue">
              <header><strong>Việc cần xử lý</strong><span>Hôm nay</span></header>
              <ul>
                <li><span data-tone="warning" /> Duyệt milestone thiết kế <small>09:30</small></li>
                <li><span data-tone="critical" /> SSL sắp hết hạn <small>12 ngày</small></li>
                <li><span data-tone="success" /> Backup đã xác minh <small>07:42</small></li>
              </ul>
            </section>
          </div>
        </section>
      </div>
    </figure>
  );
}
