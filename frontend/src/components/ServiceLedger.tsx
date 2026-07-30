import { ArrowUpRight } from 'lucide-react';

import { services } from '../content';

export function ServiceLedger() {
  return (
    <section id="services" className="service-section" aria-labelledby="services-title">
      <div className="section-shell service-layout">
        <header className="section-head section-head--sticky">
          <h2 id="services-title">Năng lực theo đầu ra.</h2>
          <p>
            Mỗi phạm vi bắt đầu bằng tài sản và rủi ro cần quyết định, sau đó mới
            chọn kỹ thuật đánh giá phù hợp.
          </p>
          <a className="text-link" href="#contact">
            Trao đổi phạm vi
            <ArrowUpRight aria-hidden="true" />
          </a>
        </header>

        <div className="service-ledger">
          <table>
            <caption className="visually-hidden">
              Dịch vụ an ninh QTS, kết quả bàn giao và điểm bắt đầu
            </caption>
            <thead>
              <tr>
                <th scope="col">Năng lực</th>
                <th scope="col">Kết quả bàn giao</th>
                <th scope="col">Điểm bắt đầu</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr id={`service-${service.id}`} key={service.id}>
                  <th scope="row" data-label="Năng lực">
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </th>
                  <td data-label="Kết quả bàn giao">{service.deliverable}</td>
                  <td data-label="Điểm bắt đầu">{service.startingPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
