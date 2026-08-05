import type { ReactNode } from 'react';

export function SectionHeading({
  title,
  description,
  action,
  align = 'left',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <header className="qts-section-heading" data-align={align}>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="qts-section-heading__action">{action}</div>}
    </header>
  );
}
