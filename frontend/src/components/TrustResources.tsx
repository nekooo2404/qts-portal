import { Plus } from 'lucide-react';

import { resources } from '../content';

const principles = [
  {
    title: 'Bắt đầu từ tài sản',
    description: 'Rủi ro chỉ có nghĩa khi gắn với hệ thống, dữ liệu và người chịu trách nhiệm.',
  },
  {
    title: 'Bằng chứng trước kết luận',
    description: 'Mỗi phát hiện cần có dấu vết kỹ thuật đủ để xác minh và quyết định.',
  },
  {
    title: 'Kiểm tra lại sau thay đổi',
    description: 'Khắc phục chưa hoàn tất cho tới khi đường tấn công đã được đóng và xác nhận.',
  },
];

export function TrustResources() {
  return (
    <>
      <section id="about" className="trust-section" aria-labelledby="trust-title">
        <div className="section-shell trust-layout">
          <header className="section-head">
            <h2 id="trust-title">An ninh phải kiểm chứng được.</h2>
            <p>
              QTS đặt kỹ thuật trong bối cảnh vận hành để đội ngũ biết điều gì cần
              xử lý, vì sao và cách xác nhận kết quả.
            </p>
          </header>

          <div className="principle-list">
            {principles.map((principle) => (
              <article key={principle.title}>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="resources"
        className="resources-section"
        aria-labelledby="resources-title"
      >
        <div className="section-shell resources-layout">
          <header className="section-head">
            <h2 id="resources-title">Hồ sơ chuẩn bị.</h2>
            <p>Ba điểm bắt đầu cho những cuộc trao đổi an ninh thường gặp.</p>
          </header>

          <div className="resource-list">
            {resources.map((resource) => (
              <details id={`resource-${resource.id}`} key={resource.id}>
                <summary>
                  <span>
                    <strong>{resource.title}</strong>
                    <small>{resource.summary}</small>
                  </span>
                  <Plus aria-hidden="true" />
                </summary>
                <p>{resource.detail}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
