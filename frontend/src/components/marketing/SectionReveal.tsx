import type { ComponentPropsWithoutRef } from 'react';

type SectionRevealProps = ComponentPropsWithoutRef<'section'>;

export function SectionReveal(props: SectionRevealProps) {
  return <section {...props} data-section-reveal />;
}
