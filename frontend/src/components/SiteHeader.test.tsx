import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SiteHeader } from './SiteHeader';

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
}));

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      createElement('a', { ...props, href }, children)
    ),
  };
});

describe('SiteHeader', () => {
  it('opens the service menu and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const trigger = screen.getByRole('button', { name: 'Dịch vụ' });
    await user.click(trigger);

    const menu = screen.getByRole('region', { name: 'Dịch vụ QTS' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(menu).getByRole('link', { name: /Thiết kế website/ })).toHaveAttribute(
      'href',
      '/dich-vu/thiet-ke-website',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Dịch vụ QTS' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('locks scrolling only while mobile navigation is open', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const trigger = screen.getByRole('button', { name: 'Mở điều hướng' });
    await user.click(trigger);
    expect(screen.getByRole('navigation', { name: 'Điều hướng di động' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Điều hướng di động' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('returns focus after closing search with Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(<SiteHeader />);
    const trigger = container.querySelector<HTMLButtonElement>('.qts-search-trigger');

    expect(trigger).not.toBeNull();
    await user.click(trigger!);
    const dialog = container.querySelector('dialog[open]');
    expect(dialog).toBeInTheDocument();

    fireEvent(dialog!, new Event('cancel', { cancelable: true }));
    expect(container.querySelector('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
