import type { AnchorHTMLAttributes, MouseEvent } from 'react';

import { navigateTo } from '../../lib/navigation';

type PortalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
};

export function PortalLink({ onClick, target, to, ...props }: PortalLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === '_blank'
    ) {
      return;
    }

    event.preventDefault();
    navigateTo(to);
  };

  return <a {...props} href={to} onClick={handleClick} target={target} />;
}
