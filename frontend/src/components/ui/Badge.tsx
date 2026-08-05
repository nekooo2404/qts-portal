import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

const badgeVariants = cva('portal-status', {
  variants: {
    tone: {
      neutral: '',
      healthy: '',
      warning: '',
      critical: '',
      info: '',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ tone }), className)}
      data-tone={tone}
      {...props}
    />
  );
}
