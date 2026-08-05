import { ChevronDown } from 'lucide-react';

export function FaqList({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <div className="qts-faq-list">
      {items.map((item, index) => (
        <details key={item.question} open={index === 0}>
          <summary>
            <span>{item.question}</span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
