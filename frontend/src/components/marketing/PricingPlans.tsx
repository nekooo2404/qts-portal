'use client';

import { Check, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { pricingPlans } from '../../marketing/content';

export function PricingPlans({ compact = false }: { compact?: boolean }) {
  const [billing, setBilling] = useState<'month' | 'year'>('year');

  return (
    <div className="qts-pricing" data-compact={compact}>
      <div className="qts-segmented" role="group" aria-label="Chu kỳ thanh toán">
        <button type="button" aria-pressed={billing === 'month'} onClick={() => setBilling('month')}>Theo tháng</button>
        <button type="button" aria-pressed={billing === 'year'} onClick={() => setBilling('year')}>Theo năm</button>
      </div>
      <p className="qts-pricing__billing-note" aria-live="polite">
        {billing === 'year'
          ? 'Hợp đồng năm phù hợp với phạm vi vận hành liên tục; mức phí được xác nhận sau khảo sát.'
          : 'Gói theo tháng phù hợp để bắt đầu với phạm vi nhỏ; mức phí được xác nhận sau khảo sát.'}
      </p>

      <div className="qts-pricing__plans">
        {pricingPlans.map((plan) => (
          <article className="qts-pricing-plan" data-recommended={plan.recommended} key={plan.id}>
            <header>
              <div>
                {plan.recommended && <span className="qts-pricing-plan__flag"><CircleCheck aria-hidden="true" /> Khuyên dùng</span>}
                <h3>{plan.title}</h3>
                <p>{plan.fit}</p>
              </div>
              <strong>{plan.price}</strong>
            </header>
            <ul>
              {plan.features.map((feature) => <li key={feature}><Check aria-hidden="true" /> {feature}</li>)}
            </ul>
            <Link className={`qts-button ${plan.recommended ? 'qts-button--primary' : 'qts-button--secondary'}`} href={`/lien-he?goi=${plan.id}`}>
              {plan.id === 'enterprise' ? 'Trao đổi phạm vi' : 'Nhận báo giá'}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
