import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ElementRef,
} from 'react';

import { cn } from '../../lib/cn';

const buttonVariants = cva('portal-button', {
  variants: {
    variant: {
      primary: 'portal-button--primary',
      secondary: 'portal-button--secondary',
      ghost: 'portal-button--ghost',
      critical: 'portal-button--critical',
    },
    size: {
      default: '',
      compact: 'portal-button--compact',
      icon: 'portal-icon-button',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'default',
  },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<ElementRef<'button'>, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';

    return (
      <Component
        className={cn(buttonVariants({ size, variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
