import { ArrowRight } from 'lucide-react';

import { operatingSteps } from '../content';

export function OperationsFlow() {
  return (
    <section
      id="operations"
      className="operations-band"
      aria-labelledby="operations-title"
    >
      <div className="section-shell">
        <header className="operations-band__head">
          <h2 id="operations-title">Phòng thủ là một vòng vận hành.</h2>
          <p>
            Báo cáo chỉ có giá trị khi phát hiện đi được tới chủ sở hữu, thay đổi
            và kiểm tra lại.
          </p>
        </header>

        <ol className="operations-flow">
          {operatingSteps.map((step, index) => (
            <li key={step.number}>
              <span className="operations-flow__number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              {index < operatingSteps.length - 1 && (
                <ArrowRight className="operations-flow__arrow" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
