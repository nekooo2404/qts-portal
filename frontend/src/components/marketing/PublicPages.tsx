import { ArrowRight, Check, CircleCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  services,
  solutions,
  type Service,
  type Solution,
} from '../../marketing/content';
import { FaqList } from './FaqList';
import { LeadForm } from './LeadForm';
import { MarketingShell } from './MarketingShell';
import { ProductPreview } from './ProductPreview';
import { SectionHeading } from './SectionHeading';

function PublicHero({ eyebrow, title, description, aside, children }: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="qts-public-hero">
      <div className="qts-shell qts-public-hero__layout">
        <div className="qts-public-hero__copy">
          <p className="qts-eyebrow"><span /> {eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          {children && <div className="qts-public-hero__actions">{children}</div>}
        </div>
        {aside && <div className="qts-public-hero__aside">{aside}</div>}
      </div>
    </section>
  );
}

function PublicCta({ title = 'Bắt đầu từ phạm vi doanh nghiệp đang cần xử lý.' }: { title?: string }) {
  return (
    <section className="qts-public-cta">
      <div className="qts-shell qts-public-cta__inner">
        <div><p className="qts-kicker">Trao đổi cùng QTS Việt Nam</p><h2>{title}</h2></div>
        <Link className="qts-button qts-button--on-dark" href="/lien-he">Đăng ký tư vấn <ArrowRight aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

export function ServicesPage() {
  return (
    <MarketingShell>
      <main id="main-content" className="marketing-page">
        <PublicHero eyebrow="Danh mục dịch vụ" title="Dịch vụ công nghệ theo bài toán thật" description="QTS Việt Nam tư vấn, thiết kế và triển khai dịch vụ theo mục tiêu, phạm vi và cách vận hành của từng doanh nghiệp." aside={<DetailFacts items={[["Bắt đầu", "Từ mục tiêu và hiện trạng"], ["Triển khai", "Theo phạm vi được xác nhận"], ["Bàn giao", "Có tiêu chí nghiệm thu"]]} />}>
          <Link className="qts-button qts-button--primary" href="/lien-he">Trao đổi nhu cầu <ArrowRight aria-hidden="true" /></Link>
        </PublicHero>
        <section className="qts-section qts-directory">
          <div className="qts-shell">
            <SectionHeading title="Chọn dịch vụ cần xử lý" description="Mỗi dịch vụ có thể triển khai độc lập hoặc kết nối theo lộ trình đã xác nhận." />
            <div className="qts-directory__grid">
              {services.map((service, index) => (
                <article key={service.slug}>
                  <span>0{index + 1}</span><h2>{service.title}</h2><p>{service.summary}</p>
                  <dl><div><dt>Bài toán</dt><dd>{service.problem}</dd></div><div><dt>Đầu ra</dt><dd>{service.benefit}</dd></div></dl>
                  <Link className="qts-text-link" href={`/dich-vu/${service.slug}`}>Xem phạm vi dịch vụ <ArrowRight aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>
        <PublicCta />
      </main>
    </MarketingShell>
  );
}

export function ServicePage({ service }: { service: Service }) {
  return (
    <MarketingShell>
      <main id="main-content" className="marketing-page">
        <PublicHero eyebrow={`Dịch vụ · ${service.title}`} title={service.solution} description={service.summary} aside={<DetailFacts items={[['Bài toán', service.problem], ['Cách triển khai', service.implementation]]} />}>
          <Link className="qts-button qts-button--primary" href={`/lien-he?dich-vu=${service.serviceInterest}`}>Nhận tư vấn phạm vi <ArrowRight aria-hidden="true" /></Link>
          <Link className="qts-button qts-button--secondary" href="/dich-vu">Tất cả dịch vụ</Link>
        </PublicHero>
        <section className="qts-section qts-detail">
          <div className="qts-shell qts-detail__split">
            <div><p className="qts-kicker">Phạm vi triển khai</p><h2>Những việc QTS Việt Nam cùng doanh nghiệp thực hiện</h2><ol className="qts-numbered-list">{service.scope.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ol></div>
            <div><p className="qts-kicker">Đầu ra bàn giao</p><h2>Bằng chứng để nghiệm thu và vận hành</h2><ul className="qts-check-list">{service.deliverables.map((item) => <li key={item}><CircleCheck aria-hidden="true" />{item}</li>)}</ul><div className="qts-tech-list"><strong>Nền tảng tham khảo</strong>{service.technologies.map((item) => <span key={item}>{item}</span>)}</div></div>
          </div>
        </section>
        <section className="qts-section qts-detail-preview"><div className="qts-shell qts-detail-preview__layout"><div><p className="qts-kicker">Lợi ích kỳ vọng</p><h2>{service.benefit}</h2><p>{service.implementation}</p></div><ProductPreview variant="projects" compact /></div></section>
        <section className="qts-section qts-faq"><div className="qts-shell qts-faq__layout"><header className="qts-sticky-intro"><p className="qts-kicker">FAQ dịch vụ</p><h2>Điều cần rõ trước khi chốt phạm vi.</h2></header><FaqList items={service.faq} /></div></section>
        <PublicCta title={`Trao đổi phạm vi ${service.title.toLocaleLowerCase('vi')}.`} />
      </main>
    </MarketingShell>
  );
}

export function SolutionsPage() {
  return (
    <MarketingShell>
      <main id="main-content" className="marketing-page">
        <PublicHero eyebrow="Giải pháp theo ngành" title="Giải pháp theo bối cảnh kinh doanh" description="QTS Việt Nam kết nối dịch vụ, dữ liệu và quy trình theo nhu cầu vận hành của từng ngành." aside={<DetailFacts items={[["Bối cảnh", "Theo mô hình vận hành"], ["Kiến trúc", "Theo hệ thống hiện tại"], ["Ưu tiên", "Theo quyết định cần cải thiện"]]} />}>
          <Link className="qts-button qts-button--primary" href="/lien-he">Khảo sát giải pháp <ArrowRight aria-hidden="true" /></Link>
        </PublicHero>
        <section className="qts-section qts-solution-directory"><div className="qts-shell"><SectionHeading title="Bắt đầu từ bài toán của ngành" description="Không áp một quy trình giống nhau cho mọi doanh nghiệp." /><div className="qts-solution-directory__grid">{solutions.map((solution, index) => <article key={solution.slug}><header><span>0{index + 1}</span></header><small>{solution.audience}</small><h2>{solution.title}</h2><p>{solution.challenge}</p><ul>{solution.modules.map((module) => <li key={module}>{module}</li>)}</ul><Link className="qts-text-link" href={`/giai-phap/${solution.slug}`}>Xem giải pháp <ArrowRight aria-hidden="true" /></Link></article>)}</div></div></section>
        <PublicCta />
      </main>
    </MarketingShell>
  );
}

export function SolutionPage({ solution }: { solution: Solution }) {
  return (
    <MarketingShell>
      <main id="main-content" className="marketing-page">
        <PublicHero eyebrow={`Giải pháp · ${solution.title}`} title={solution.summary} description={solution.challenge} aside={<DetailFacts items={[['Đối tượng', solution.audience], ['Module', solution.modules.join(' · ')]]} />}>
          <Link className="qts-button qts-button--primary" href={`/lien-he?giai-phap=${solution.slug}`}>Nhận đề xuất giải pháp <ArrowRight aria-hidden="true" /></Link>
          <Link className="qts-button qts-button--secondary" href="/giai-phap">Tất cả ngành</Link>
        </PublicHero>
        <section className="qts-section qts-solution-flow"><div className="qts-shell"><SectionHeading title="Kết quả kỳ vọng" description="Các kết quả cần được xác nhận theo bối cảnh và phạm vi cụ thể." /><div className="qts-solution-outcomes">{solution.outcomes.map((outcome) => <div key={outcome}><Check aria-hidden="true" /><span>{outcome}</span></div>)}</div></div></section>
        <PublicCta title={`Khảo sát giải pháp cho ${solution.title.toLocaleLowerCase('vi')}.`} />
      </main>
    </MarketingShell>
  );
}

export function ProjectsPage() {
  return <UnpublishedCollectionPage eyebrow="Dự án" title="Hồ sơ dự án chỉ được công bố sau khi xác minh" description="QTS Việt Nam chỉ đăng thông tin khách hàng, phạm vi và kết quả khi đã có dữ liệu cùng quyền công bố phù hợp." />;
}

export function NewsPage() {
  return <UnpublishedCollectionPage eyebrow="Tin tức" title="Nội dung chỉ xuất bản sau khi hoàn tất biên tập" description="Các bài viết sẽ xuất hiện tại đây khi nguồn, ngày cập nhật và người chịu trách nhiệm nội dung đã được xác nhận." />;
}

function UnpublishedCollectionPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <MarketingShell><main id="main-content" className="marketing-page"><PublicHero eyebrow={eyebrow} title={title} description={description}><Link className="qts-button qts-button--primary" href="/dich-vu">Xem dịch vụ đang cung cấp <ArrowRight aria-hidden="true" /></Link></PublicHero><PublicCta /></main></MarketingShell>;
}

export function AboutPage() {
  return <MarketingShell><main id="main-content" className="marketing-page"><PublicHero eyebrow="Giới thiệu QTS Việt Nam" title="Xây năng lực công nghệ có thể vận hành lâu dài" description="QTS Việt Nam đồng hành cùng doanh nghiệp qua tư vấn, thiết kế, phát triển, triển khai và hỗ trợ kỹ thuật."><Link className="qts-button qts-button--primary" href="/lien-he">Làm việc cùng QTS Việt Nam <ArrowRight aria-hidden="true" /></Link></PublicHero><section className="qts-section qts-principles"><div className="qts-shell"><SectionHeading title="Nguyên tắc làm việc" /><div className="qts-principles__grid"><article><h2>Phạm vi trước công nghệ</h2><p>Bắt đầu từ quyết định, người dùng và dữ liệu cần cải thiện.</p></article><article><h2>Đầu ra có thể nghiệm thu</h2><p>Mỗi giai đoạn tạo ra bằng chứng đủ để quyết định bước tiếp theo.</p></article><article><h2>Vận hành là một phần sản phẩm</h2><p>Bàn giao đi cùng tài liệu, trách nhiệm và kế hoạch cải tiến.</p></article></div></div></section><PublicCta /></main></MarketingShell>;
}

export function ContactPage() {
  return <MarketingShell><main id="main-content" className="marketing-page"><PublicHero eyebrow="Liên hệ" title="Bắt đầu bằng bối cảnh thật của doanh nghiệp" description="Mô tả mục tiêu, hệ thống hiện tại và thời điểm cần triển khai. Yêu cầu hợp lệ được chuyển vào kênh tiếp nhận của QTS Việt Nam." aside={<DetailFacts items={[["Tiếp nhận", "Qua biểu mẫu có kiểm tra dữ liệu"], ["Phạm vi", "Được xác nhận trước khi báo giá"], ["Bàn giao", "Theo tiêu chí nghiệm thu thống nhất"]]} />} /><section className="qts-lead qts-lead--page"><div className="qts-shell qts-lead__layout"><header><p className="qts-kicker">Yêu cầu tư vấn</p><h2>Thông tin đủ rõ giúp kết nối đúng chuyên môn.</h2><p>Sau khi gửi thành công, yêu cầu có mã tiếp nhận để đội QTS xử lý.</p><ul><li><Check aria-hidden="true" /> Không tự động đăng ký quảng cáo</li><li><Check aria-hidden="true" /> Có kiểm tra dữ liệu đầu vào</li></ul></header><LeadForm /></div></section></main></MarketingShell>;
}

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const privacy = type === 'privacy';
  const title = privacy ? 'Chính sách bảo mật và dữ liệu' : 'Điều khoản sử dụng';
  return <MarketingShell><main id="main-content" className="marketing-page"><PublicHero eyebrow="Pháp lý · Bản dự thảo" title={title} description="Nội dung dưới đây là bản dự thảo cấu trúc, cần được bộ phận pháp lý phê duyệt trước khi đưa vào production." aside={<div className="qts-demo-notice"><ShieldCheck aria-hidden="true" /><strong>Trạng thái tài liệu</strong><p>Dự thảo · chưa phải văn bản pháp lý chính thức.</p></div>} /><section className="qts-section qts-legal"><article className="qts-shell"><section><h2>1. Phạm vi áp dụng</h2><p>Tài liệu này mô tả định hướng áp dụng cho website công khai và khu vực được cấp quyền.</p></section><section><h2>2. Dữ liệu và tài khoản</h2><p>{privacy ? 'Không yêu cầu cung cấp mật khẩu, access token hoặc dữ liệu thẻ qua biểu mẫu công khai.' : 'Quyền truy cập được giới hạn theo tổ chức và tài nguyên.'}</p></section><section><h2>3. Thay đổi tài liệu</h2><p>Phiên bản chính thức sẽ ghi ngày hiệu lực, lịch sử sửa đổi và kênh liên hệ đã xác thực.</p></section></article></section></main></MarketingShell>;
}

function DetailFacts({ items }: { items: Array<[string, string]> }) { return <dl className="qts-detail-facts">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }
