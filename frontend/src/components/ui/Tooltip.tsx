import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { type ComponentProps, type ReactElement, type ReactNode } from 'react';

export function TooltipProvider(props: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider {...props} />;
}

export function Tooltip({
  children,
  content,
  disabled = false,
  side = 'right',
}: {
  children: ReactElement;
  content: ReactNode;
  disabled?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  if (disabled) return children;

  return (
    <TooltipPrimitive.Root delayDuration={180}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="portal-tooltip"
          collisionPadding={8}
          side={side}
          sideOffset={8}
        >
          {content}
          <TooltipPrimitive.Arrow className="portal-tooltip__arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
