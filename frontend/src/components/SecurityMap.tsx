import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  Braces,
  CloudCog,
  KeyRound,
  Radar,
  Siren,
} from 'lucide-react';
import { useState } from 'react';

import { securityNodes } from '../content';

const nodeIcons: Record<string, LucideIcon> = {
  'attack-surface': Radar,
  identity: KeyRound,
  application: Braces,
  cloud: CloudCog,
  response: Siren,
};

export function SecurityMap() {
  const [activeId, setActiveId] = useState(securityNodes[0].id);
  const activeNode =
    securityNodes.find((node) => node.id === activeId) ?? securityNodes[0];

  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero__intro">
        <h1 id="hero-title">Thấy rủi ro. Giữ vững vận hành.</h1>
        <p>
          QTS kết nối đánh giá, phòng thủ và ứng phó cho đội ngũ công nghệ tại
          Việt Nam.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#contact">
            Đặt lịch đánh giá
          </a>
          <a className="text-link" href="#services">
            Xem năng lực
            <ArrowDown aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="security-map" aria-label="Bản đồ năng lực an ninh QTS">
        <svg
          className="security-map__connections"
          viewBox="0 0 1000 620"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M500 310 C360 310 300 120 185 100" />
          <path d="M500 310 C650 300 720 110 835 100" />
          <path d="M500 310 C360 340 260 470 145 500" />
          <path d="M500 310 C640 350 730 500 855 500" />
          <path d="M500 310 C500 390 500 480 500 570" />
        </svg>

        <div className="security-map__core">
          <img
            src="/qts-logo-160.webp"
            srcSet="/qts-logo-160.webp 160w, /qts-logo.webp 320w"
            sizes="(min-width: 60rem) 160px, 72px"
            width="320"
            height="320"
            fetchPriority="high"
            alt="Biểu tượng khiên QTS"
          />
          <span>QTS</span>
          <small>Technology · Security</small>
        </div>

        <div className="security-map__nodes">
          {securityNodes.map((node) => {
            const Icon = nodeIcons[node.id];
            const isActive = node.id === activeNode.id;

            return (
              <button
                key={node.id}
                type="button"
                className={`security-node security-node--${node.id}`}
                aria-label={node.label}
                aria-pressed={isActive}
                onClick={() => setActiveId(node.id)}
              >
                <Icon aria-hidden="true" />
                <span className="security-node__label--compact">
                  {node.shortLabel}
                </span>
                <span className="security-node__label--full">{node.label}</span>
              </button>
            );
          })}
        </div>

        <div className="security-map__detail" aria-live="polite">
          <span>{activeNode.shortLabel}</span>
          <strong>{activeNode.summary}</strong>
          <p>{activeNode.detail}</p>
        </div>
      </div>
    </section>
  );
}
