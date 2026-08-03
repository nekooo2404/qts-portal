import { useCallback, useEffect, useState } from 'react';

import { listResource } from './api';
import type { CollectionResponse, LoadState, PortalResource } from './types';

interface CollectionOptions {
  pageSize?: number;
  search?: string;
  tenantId?: string;
}

const EMPTY_COLLECTION: CollectionResponse = Object.freeze({
  data: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
});

export function usePortalCollection(resource: PortalResource, options: CollectionOptions = {}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<LoadState<CollectionResponse>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listResource(resource, {
      pageSize: options.pageSize ?? 100,
      search: options.search,
      tenantId: options.tenantId,
      signal: controller.signal,
    }).then(
      (data) => {
        if (active) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'error', error: error instanceof Error ? error : new Error('Unknown error') });
        }
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [options.pageSize, options.search, options.tenantId, resource, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return {
    data: state.status === 'ready' ? state.data : EMPTY_COLLECTION,
    error: state.status === 'error' ? state.error : null,
    loading: state.status === 'loading',
    reload,
  };
}
