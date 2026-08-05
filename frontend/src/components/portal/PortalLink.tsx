import Link from 'next/link';
import type { ComponentProps } from 'react';

type PortalLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  to: string;
};

export function PortalLink({ to, ...props }: PortalLinkProps) {
  return <Link {...props} href={to} />;
}
