import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { AuthContext } from './auth-context';
import type { AuthState, PortalRole, PortalSession } from './types';

const PORTAL_ROLES = new Set<PortalRole>([
  'client_admin',
  'client_viewer',
  'billing',
  'technical',
  'soc_l1',
  'soc_l2',
  'soc_l3',
  'account_manager',
  'qts_admin',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseConfigured(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.data) || typeof value.data.configured !== 'boolean') {
    throw new Error('Invalid authentication status response.');
  }
  return value.data.configured;
}

function parseSession(value: unknown): PortalSession {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error('Invalid session response.');
  }
  const data = value.data;
  if (!isRecord(data.user) || !isRecord(data.authorization)) {
    throw new Error('Invalid session response.');
  }

  const { email, displayName } = data.user;
  const { tenantId, role, workspace } = data.authorization;
  const { csrfToken, expiresAt } = data;
  if (
    typeof email !== 'string' ||
    typeof displayName !== 'string' ||
    typeof tenantId !== 'string' ||
    typeof role !== 'string' ||
    !PORTAL_ROLES.has(role as PortalRole) ||
    (workspace !== 'client' && workspace !== 'internal') ||
    typeof csrfToken !== 'string' ||
    typeof expiresAt !== 'string' ||
    Number.isNaN(Date.parse(expiresAt))
  ) {
    throw new Error('Invalid session response.');
  }

  return {
    user: { email, displayName },
    authorization: {
      tenantId,
      role: role as PortalRole,
      workspace,
    },
    csrfToken,
    expiresAt,
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadAuth() {
      try {
        const statusResponse = await fetch('/api/v1/auth/status', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!statusResponse.ok) throw new Error('Authentication status unavailable.');
        const configured = parseConfigured(await readJson(statusResponse));
        if (!active) return;
        if (!configured) {
          setState({ status: 'unconfigured' });
          return;
        }

        const sessionResponse = await fetch('/api/v1/auth/session', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!active) return;
        if (sessionResponse.status === 401) {
          setState({ status: 'anonymous' });
          return;
        }
        if (!sessionResponse.ok) throw new Error('Session unavailable.');
        const session = parseSession(await readJson(sessionResponse));
        if (!active) return;
        setState({
          status: 'authenticated',
          session,
        });
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'error' });
        }
      }
    }

    void loadAuth();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const loginHref = useCallback(
    (returnTo: string) =>
      `/api/v1/auth/login/google?returnTo=${encodeURIComponent(returnTo)}`,
    [],
  );

  const logout = useCallback(async () => {
    if (state.status !== 'authenticated') return;

    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'X-CSRF-Token': state.session.csrfToken,
        },
      });
      if (!response.ok) throw new Error('Logout failed.');
      setState({ status: 'anonymous' });
    } catch {
      setState({ status: 'error' });
    }
  }, [state]);

  const value = useMemo(
    () => ({ state, loginHref, logout }),
    [loginHref, logout, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
