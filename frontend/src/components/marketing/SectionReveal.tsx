'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

type SectionRevealProps = Omit<
  HTMLMotionProps<'section'>,
  'initial' | 'transition' | 'viewport' | 'whileInView'
>;

export function SectionReveal(props: SectionRevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      {...props}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ amount: 0.08, once: true }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
    />
  );
}
