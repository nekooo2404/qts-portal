import { useSyncExternalStore } from 'react';

const NAVIGATION_EVENT = 'qts:portal-navigation';
const INTERNAL_PATH_PATTERN = /^\/(?:[a-z0-9-]+\/?)*$/iu;

export function navigateTo(path: string, options: { replace?: boolean } = {}): void {
  if (!INTERNAL_PATH_PATTERN.test(path)) {
    throw new Error('QTS Portal chỉ cho phép điều hướng tới đường dẫn nội bộ.');
  }

  if (options.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }

  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function useCurrentPath(): string {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener('popstate', notify);
      window.addEventListener(NAVIGATION_EVENT, notify);
      return () => {
        window.removeEventListener('popstate', notify);
        window.removeEventListener(NAVIGATION_EVENT, notify);
      };
    },
    () => window.location.pathname,
    () => '/',
  );
}
