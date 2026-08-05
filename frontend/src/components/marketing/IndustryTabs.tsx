'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { solutions } from '../../marketing/content';

export function IndustryTabs() {
  const [activeSlug, setActiveSlug] = useState(solutions[0]?.slug ?? 'ban-le');
  const tabsId = useId();
  const active = solutions.find((item) => item.slug === activeSlug) ?? solutions[0];
  if (!active) return null;

  const activateTab = (nextIndex: number, currentTarget: HTMLButtonElement) => {
    const next = solutions[nextIndex];
    if (!next) return;
    setActiveSlug(next.slug);
    currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <div className="qts-industry-tabs">
      <label className="qts-industry-tabs__select" htmlFor={`${tabsId}-select`}>
        <span>Chọn ngành</span>
        <select id={`${tabsId}-select`} value={activeSlug} onChange={(event) => setActiveSlug(event.target.value)}>
          {solutions.map((item) => <option value={item.slug} key={item.slug}>{item.title}</option>)}
        </select>
      </label>

      <div className="qts-industry-tabs__list" role="tablist" aria-label="Giải pháp theo ngành">
        {solutions.map((item, index) => (
          <button
            type="button"
            role="tab"
            aria-selected={active.slug === item.slug}
            aria-controls={`${tabsId}-panel`}
            id={`${tabsId}-${item.slug}`}
            key={item.slug}
            tabIndex={active.slug === item.slug ? 0 : -1}
            onClick={() => setActiveSlug(item.slug)}
            onKeyDown={(event) => {
              let nextIndex: number | undefined;
              if (event.key === 'ArrowRight') nextIndex = (index + 1) % solutions.length;
              if (event.key === 'ArrowLeft') nextIndex = (index - 1 + solutions.length) % solutions.length;
              if (event.key === 'Home') nextIndex = 0;
              if (event.key === 'End') nextIndex = solutions.length - 1;
              if (nextIndex === undefined) return;
              event.preventDefault();
              activateTab(nextIndex, event.currentTarget);
            }}
          >
            {item.title}
          </button>
        ))}
      </div>

      <section
        className="qts-industry-tabs__panel"
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${active.slug}`}
        key={active.slug}
      >
        <div>
          <span>Thách thức</span>
          <h3>{active.challenge}</h3>
          <p>{active.summary}</p>
          <Link className="qts-text-link" href={`/giai-phap/${active.slug}`}>
            Xem giải pháp <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <dl>
          <div><dt>Module phù hợp</dt><dd>{active.modules.join(' · ')}</dd></div>
          <div><dt>Kết quả kỳ vọng</dt><dd>{active.outcomes.join(' · ')}</dd></div>
        </dl>
      </section>
    </div>
  );
}
