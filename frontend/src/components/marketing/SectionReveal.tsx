'use client';

import { domAnimation, LazyMotion, m, useReducedMotion, type HTMLMotionProps } from 'motion/react';

type SectionRevealProps = Omit<
  HTMLMotionProps<'section'>,
  'initial' | 'transition' | 'viewport' | 'whileInView'
>;

export function SectionReveal(props: SectionRevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        {...props}
        data-section-reveal
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ amount: 0.02, once: true }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      />
    </LazyMotion>
  );
}
