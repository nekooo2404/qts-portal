import {
  ArrowRight,
  Blocks,
  Building2,
  Check,
  ChevronRight,
  CircleCheck,
  CloudCog,
  FileCheck2,
  FolderKanban,
  Gauge,
  Headphones,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Network,
  Radar,
  ServerCog,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';

const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://qts-one.example').replace(/\/$/u, '');

import { FaqList } from '../components/marketing/FaqList';
import { IndustryTabs } from '../components/marketing/IndustryTabs';
import { JsonLd } from '../components/marketing/JsonLd';
import { LeadForm } from '../components/marketing/LeadForm';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { PricingPlans } from '../components/marketing/PricingPlans';
import { ProductPreview } from '../components/marketing/ProductPreview';
import { SectionHeading } from '../components/marketing/SectionHeading';
import { SectionReveal } from '../components/marketing/SectionReveal';
import {
  articles,
  caseStudies,
  frequentlyAskedQuestions,
  platformFeatures,
  processSteps,
} from '../marketing/content';

const outcomes = [
  {
    icon: LayoutDashboard,
    index: '01',
    title: 'Một nơi để điều hành',
    copy: 'Dịch vụ, dự án, hợp đồng, tài sản và yêu cầu hỗ trợ cùng nằm trong một bối cảnh vận hành.',
    detail: 'Giảm thời gian tổng hợp trạng thái từ nhiều bảng tính, email và nhóm chat.',
  },
  {
    icon: FolderKanban,
    index: '02',
    title: 'Một quy trình có thể truy vết',
    copy: 'Mọi phê duyệt, thay đổi phạm vi và bàn giao đều có owner, thời điểm và lịch sử rõ ràng.',
    detail: 'Lãnh đạo biết việc gì đang chờ, ai cần xử lý và rủi ro nằm ở đâu.',
  },
  {
    icon: ShieldCheck,
    index: '03',
    title: 'Một lớp kiểm soát xuyên suốt',
    copy: 'Phân quyền, audit log và các mốc SLA được đưa vào luồng làm việc thay vì bổ sung về sau.',
    detail: 'Đội kỹ thuật có cùng tiêu chuẩn vận hành từ triển khai đến hỗ trợ.',
  },
];

const painPoints = [
  ['Tài sản số phân tán', 'Domain, hosting, SSL, mã nguồn và tài khoản quảng cáo thiếu owner hoặc ngày gia hạn rõ ràng.'],
  ['Dự án thiếu một trạng thái chung', 'Tiến độ, UAT, thay đổi phạm vi và tài liệu bàn giao nằm ở nhiều kênh khác nhau.'],
  ['Yêu cầu hỗ trợ khó đo lường', 'Email và tin nhắn không tạo ra mức ưu tiên, đồng hồ SLA hay lịch sử xử lý nhất quán.'],
  ['Báo cáo đến quá muộn', 'Lãnh đạo phải chờ tổng hợp thủ công mới biết chi phí, rủi ro và công việc đang chờ quyết định.'],
];

const ecosystemNodes = [
  { icon: Building2, label: 'CRM & bán hàng' },
  { icon: FolderKanban, label: 'Dự án & nghiệm thu' },
  { icon: Headphones, label: 'Service Desk' },
  { icon: ServerCog, label: 'Tài sản & hạ tầng' },
  { icon: FileCheck2, label: 'Hợp đồng & hóa đơn' },
  { icon: Radar, label: 'Bảo mật & giám sát' },
];

const featureVariants = ['projects', 'tickets', 'assets', 'analytics'] as const;

const credibilitySignals = [
  ['Từ 2011', 'Mốc hoạt động do QTS cung cấp'],
  ['[SỐ DỰ ÁN]', 'Chờ hồ sơ dự án được xác minh'],
  ['[KHÁCH HÀNG]', 'Chờ quyền công bố thương hiệu'],
  ['[CHỨNG NHẬN]', 'Chờ tài liệu năng lực được duyệt'],
] as const;

export default function MarketingPortal() {
  return (
    <MarketingShell>
      <main id="main-content" className="marketing-page">
        <section className="qts-hero" aria-labelledby="hero-title">
          <div className="qts-shell qts-hero__inner">
            <div className="qts-hero__copy">
              <p className="qts-eyebrow"><span /> QTS One · Nền tảng vận hành công nghệ</p>
              <h1 id="hero-title">Một nền tảng quản lý toàn bộ dịch vụ công nghệ của doanh nghiệp</h1>
              <p className="qts-hero__lede">
                Từ website, phần mềm, quảng cáo đến hạ tầng và hỗ trợ kỹ thuật — được quản lý tập trung trên QTS One.
              </p>
              <div className="qts-hero__actions">
                <Link className="qts-button qts-button--primary" href="/lien-he">
                  Đăng ký tư vấn <ArrowRight aria-hidden="true" />
                </Link>
                <Link className="qts-button qts-button--secondary" href="#nen-tang">
                  Khám phá nền tảng
                </Link>
                <Link className="qts-text-link" href="/login">Đăng nhập QTS One <ChevronRight aria-hidden="true" /></Link>
              </div>
              <ul className="qts-hero__assurances" aria-label="Cam kết trải nghiệm">
                <li><Check aria-hidden="true" /> Tư vấn theo phạm vi thật</li>
                <li><Check aria-hidden="true" /> Không yêu cầu thẻ thanh toán</li>
                <li><Check aria-hidden="true" /> Dữ liệu tách theo tổ chức</li>
              </ul>
            </div>

            <div className="qts-hero__preview">
              <ProductPreview />
            </div>
          </div>
        </section>

        <SectionReveal className="qts-proof" aria-label="Thông tin năng lực đã xác minh và vị trí chờ dữ liệu">
          <div className="qts-shell qts-proof__grid">
            {credibilitySignals.map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}
          </div>
          <div className="qts-shell qts-proof__logos" aria-label="Vị trí dành cho thương hiệu khách hàng đã được cho phép">
            <span>Thương hiệu khách hàng sẽ được cập nhật sau xác thực</span>
            {['Logo 01', 'Logo 02', 'Logo 03', 'Logo 04', 'Logo 05'].map((item) => <i key={item}>{item}</i>)}
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-pains" aria-labelledby="pain-title">
          <div className="qts-shell qts-pains__layout">
            <header className="qts-sticky-intro">
              <p className="qts-kicker">Vấn đề vận hành</p>
              <h2 id="pain-title">Công nghệ tạo giá trị khi mọi người nhìn cùng một sự thật.</h2>
              <p>QTS One nối các điểm rời rạc thành một luồng có trách nhiệm, trạng thái và bằng chứng.</p>
            </header>
            <ol className="qts-pain-list">
              {painPoints.map(([title, copy], index) => (
                <li key={title}>
                  <span>0{index + 1}</span>
                  <div><h3>{title}</h3><p>{copy}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-outcomes" aria-labelledby="outcomes-title">
          <div className="qts-shell">
            <SectionHeading
              title="Từ dịch vụ rời rạc đến năng lực vận hành có hệ thống"
              description="Ba kết quả thiết kế làm tiêu chuẩn cho mọi module của QTS One."
            />
            <div className="qts-outcome-grid">
              {outcomes.map((outcome) => {
                const Icon = outcome.icon;
                return (
                  <article key={outcome.title}>
                    <header><span>{outcome.index}</span><Icon aria-hidden="true" /></header>
                    <h3>{outcome.title}</h3>
                    <p>{outcome.copy}</p>
                    <small>{outcome.detail}</small>
                  </article>
                );
              })}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-ecosystem" id="nen-tang" aria-labelledby="ecosystem-title">
          <div className="qts-shell">
            <SectionHeading
              align="center"
              title="Một hệ sinh thái, nhiều luồng công việc"
              description="QTS One kết nối hành trình từ cơ hội bán hàng đến triển khai, vận hành, hỗ trợ và gia hạn."
            />
            <div className="qts-ecosystem-map" aria-label="Sơ đồ hệ sinh thái QTS One">
              <div className="qts-ecosystem-map__core">
                <Blocks aria-hidden="true" />
                <strong>QTS One</strong>
                <span>Nền dữ liệu và quyền dùng chung</span>
              </div>
              {ecosystemNodes.map((node, index) => {
                const Icon = node.icon;
                return (
                  <div className="qts-ecosystem-map__node" data-position={index + 1} key={node.label}>
                    <Icon aria-hidden="true" />
                    <span>{node.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="qts-ecosystem__foundation">
              <span><KeyRound aria-hidden="true" /> IAM & phân quyền</span>
              <span><Network aria-hidden="true" /> API & tích hợp</span>
              <span><LockKeyhole aria-hidden="true" /> Audit & policy</span>
              <span><CloudCog aria-hidden="true" /> Cloud & quan sát</span>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-features" aria-labelledby="features-title">
          <div className="qts-shell">
            <SectionHeading
              title="Không chỉ xem báo cáo. Hành động ngay trong cùng workspace."
              description="Mỗi module được thiết kế quanh quyết định người dùng phải thực hiện, không phải quanh danh sách tính năng."
              action={<Link className="qts-text-link" href="/giai-phap">Xem toàn bộ giải pháp <ArrowRight aria-hidden="true" /></Link>}
            />
            <div className="qts-feature-list">
              {platformFeatures.map((feature, index) => (
                <article className="qts-feature" data-reverse={index % 2 === 1} key={feature.id}>
                  <div className="qts-feature__copy">
                    <span className="qts-feature__index">0{index + 1}</span>
                    <h3>{feature.title}</h3>
                    <p>{feature.summary}</p>
                    <ul>{feature.points.map((point) => <li key={point}><CircleCheck aria-hidden="true" /> {point}</li>)}</ul>
                    <Link className="qts-text-link" href={feature.href}>Xem phạm vi triển khai <ArrowRight aria-hidden="true" /></Link>
                  </div>
                  <ProductPreview variant={featureVariants[index]} compact />
                </article>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-industries" aria-labelledby="industries-title">
          <div className="qts-shell">
            <SectionHeading
              title="Giải pháp thay đổi theo ngành. Nền vận hành vẫn nhất quán."
              description="Chọn ngành để xem thách thức, module và kết quả kỳ vọng phù hợp."
            />
            <IndustryTabs />
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-process" aria-labelledby="process-title">
          <div className="qts-shell">
            <SectionHeading
              title="Từ khảo sát đến vận hành, mỗi bước đều có đầu ra"
              description="Tiến độ minh bạch bắt đầu bằng việc định nghĩa rõ quyết định và bằng chứng cần có ở từng giai đoạn."
            />
            <ol className="qts-process-list">
              {processSteps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  <div><h3>{step.title}</h3><small>{step.duration}</small><p>{step.output}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-cases" aria-labelledby="cases-title">
          <div className="qts-shell">
            <SectionHeading
              title="Các mô hình triển khai điển hình"
              description="Ba tình huống dưới đây là dữ liệu demo để minh họa cách QTS One tổ chức bài toán, không phải tuyên bố kết quả khách hàng thật."
              action={<Link className="qts-text-link" href="/khach-hang">Xem thư viện case study <ArrowRight aria-hidden="true" /></Link>}
            />
            <div className="qts-case-grid">
              {caseStudies.map((item, index) => (
                <article key={item.slug}>
                  <header><span>{item.industry}</span><small>Dữ liệu minh họa · 0{index + 1}</small></header>
                  <h3>{item.title}</h3>
                  <dl>
                    <div><dt>Thách thức</dt><dd>{item.challenge}</dd></div>
                    <div><dt>Cách tiếp cận</dt><dd>{item.solution}</dd></div>
                    <div><dt>Kết quả kỳ vọng</dt><dd>{item.result}</dd></div>
                  </dl>
                  <Link className="qts-text-link" href={`/khach-hang/${item.slug}`}>Xem cấu trúc giải pháp <ArrowRight aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-pricing-section" aria-labelledby="pricing-title">
          <div className="qts-shell">
            <SectionHeading
              align="center"
              title="Bắt đầu đúng với quy mô hiện tại"
              description="Giá được lập theo phạm vi và mức vận hành thực tế. Không có con số tạm dùng để tạo cảm giác giảm giá."
            />
            <PricingPlans />
          </div>
        </SectionReveal>

        <SectionReveal className="qts-trust" aria-labelledby="trust-title">
          <div className="qts-shell qts-trust__layout">
            <div className="qts-trust__copy">
              <p className="qts-kicker">Security by design</p>
              <h2 id="trust-title">Quyền truy cập và bằng chứng vận hành được thiết kế từ đầu.</h2>
              <p>QTS One hướng đến kiến trúc multi-tenant, phân quyền theo tài nguyên và audit trail cho các hành động quan trọng.</p>
              <Link className="qts-button qts-button--on-dark" href="/dich-vu/bao-mat">Xem năng lực bảo mật <ArrowRight aria-hidden="true" /></Link>
            </div>
            <ul className="qts-trust__controls">
              <li><ShieldCheck aria-hidden="true" /><div><strong>Tách dữ liệu theo tổ chức</strong><span>Tenant context đi cùng các bản ghi nghiệp vụ quan trọng.</span></div></li>
              <li><UsersRound aria-hidden="true" /><div><strong>RBAC và quyền theo tài nguyên</strong><span>Vai trò là điểm bắt đầu; quyền dự án và tài liệu mới là quyết định cuối.</span></div></li>
              <li><TimerReset aria-hidden="true" /><div><strong>Phiên và xác thực tăng cường</strong><span>MFA, giới hạn phiên và step-up cho thao tác nhạy cảm theo lộ trình IAM.</span></div></li>
              <li><Gauge aria-hidden="true" /><div><strong>Quan sát và audit</strong><span>Correlation ID, lịch sử thay đổi và cảnh báo là một phần của luồng vận hành.</span></div></li>
            </ul>
          </div>
          <div className="qts-shell qts-testimonial-demo">
            <div><Sparkles aria-hidden="true" /><span>Khu vực đánh giá khách hàng</span></div>
            <blockquote>“Nội dung đánh giá sẽ chỉ được công bố sau khi QTS có xác nhận sử dụng từ khách hàng.”</blockquote>
            <p>Dữ liệu mẫu · không phải trích dẫn khách hàng thật</p>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-knowledge" aria-labelledby="knowledge-title">
          <div className="qts-shell">
            <SectionHeading
              title="Kiến thức để đội ngũ tự vận hành tốt hơn"
              description="Tài liệu thực dụng về quản trị dịch vụ, tài sản số, SLA và chuyển đổi quy trình."
              action={<Link className="qts-text-link" href="/tai-nguyen">Đến trung tâm kiến thức <ArrowRight aria-hidden="true" /></Link>}
            />
            <div className="qts-article-list">
              {articles.map((article, index) => (
                <article id={article.slug} key={article.slug}>
                  <span>0{index + 1}</span>
                  <div><small>{article.category} · {article.updatedAt}</small><h3>{article.title}</h3><p>{article.summary}</p></div>
                  <strong>{article.readTime}</strong>
                  <ArrowRight aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal className="qts-section qts-faq" aria-labelledby="faq-title">
          <div className="qts-shell qts-faq__layout">
            <header className="qts-sticky-intro">
              <p className="qts-kicker">Câu hỏi thường gặp</p>
              <h2 id="faq-title">Những điều cần rõ trước khi bắt đầu.</h2>
              <p>Chưa thấy câu trả lời phù hợp? Gửi bối cảnh hiện tại để QTS xác định đúng đầu mối.</p>
              <Link className="qts-text-link" href="/ho-tro">Đến trung tâm hỗ trợ <ArrowRight aria-hidden="true" /></Link>
            </header>
            <FaqList items={frequentlyAskedQuestions} />
          </div>
        </SectionReveal>

        <SectionReveal className="qts-lead" id="tu-van" aria-labelledby="lead-title">
          <div className="qts-shell qts-lead__layout">
            <header>
              <p className="qts-kicker">Bắt đầu từ phạm vi thật</p>
              <h2 id="lead-title">Cho QTS biết hệ thống cần cải thiện và quyết định đang bị chậm.</h2>
              <p>Nội dung hợp lệ được chuyển trực tiếp vào kênh tiếp nhận của QTS. Bạn nhận được xác nhận ngay trên màn hình.</p>
              <ul>
                <li><Check aria-hidden="true" /> Xác định đầu mối phù hợp</li>
                <li><Check aria-hidden="true" /> Phản hồi theo thông tin đã cung cấp</li>
                <li><Check aria-hidden="true" /> Không tự động đăng ký nhận quảng cáo</li>
              </ul>
            </header>
            <LeadForm />
          </div>
        </SectionReveal>
      </main>

      <JsonLd value={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'QTS Việt Nam',
        foundingDate: '2011',
        url: siteOrigin,
        logo: `${siteOrigin}/qts-logo.webp`,
        description: 'Đơn vị phát triển và vận hành giải pháp công nghệ cho doanh nghiệp.',
      }} />
      <JsonLd value={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: frequentlyAskedQuestions.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }} />
    </MarketingShell>
  );
}
