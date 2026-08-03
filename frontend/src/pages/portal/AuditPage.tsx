import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useState } from 'react';

import { PortalEmptyState, PortalErrorState, PortalLoading } from '../../components/portal/PortalFeedback';
import { PortalStatus } from '../../components/portal/PortalStatus';
import { listSpecialResource } from '../../portal/api';
import type { CollectionResponse, LoadState } from '../../portal/types';

function formatTime(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export default function AuditPage({ selectedTenantId }: { selectedTenantId?: string }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<LoadState<CollectionResponse>>({ status: 'loading' });
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void listSpecialResource('audit', {
      search: deferredQuery,
      signal: controller.signal,
      tenantId: selectedTenantId,
    }).then(
      (data) => { if (active) setState({ status: 'ready', data }); },
      (error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'error', error: error instanceof Error ? error : new Error('Unknown error') });
        }
      },
    );
    return () => { active = false; controller.abort(); };
  }, [deferredQuery, revision, selectedTenantId]);

  const collection = state.status === 'ready' ? state.data : null;
  return (
    <main className="portal-main" id="portal-main"><div className="portal-page">
      <header className="portal-page-header">
        <div><p className="portal-eyebrow">Forensic · Append only</p><h1>Nhật ký kiểm toán</h1><p>Theo dõi đăng nhập, thay đổi cấu hình, tải tài liệu và thao tác nghiệp vụ theo tenant.</p></div>
        <button className="portal-icon-button" onClick={reload} title="Tải lại audit log" type="button"><RefreshCw aria-hidden="true" /><span className="sr-only">Tải lại</span></button>
      </header>
      <div className="portal-filter-bar">
        <label className="portal-search-field"><Search aria-hidden="true" /><span className="sr-only">Tìm audit log</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Tìm action hoặc resource ID" type="search" value={query} /></label>
        <output>{collection?.pagination.totalItems ?? 0} sự kiện</output>
      </div>
      {state.status === 'loading' ? <PortalLoading label="Đang đọc audit log" /> : state.status === 'error' ? <PortalErrorState error={state.error} onRetry={reload} /> : state.data.data.length === 0 ? (
        <PortalEmptyState title="Chưa có sự kiện kiểm toán" description="Sự kiện sẽ xuất hiện sau khi có thao tác thật trong phạm vi này." />
      ) : (
        <div className="portal-table-wrap"><table className="portal-table">
          <thead><tr><th>Thời gian</th><th>Action</th><th>Tài nguyên</th><th>Role</th><th>Kết quả</th><th>Request ID</th></tr></thead>
          <tbody>{state.data.data.map((event) => (
            <tr key={event.id}>
              <th data-label="Thời gian" scope="row"><strong>{formatTime(event.createdAt)}</strong><small>{event.id}</small></th>
              <td data-label="Action"><code>{String(event.action)}</code></td>
              <td data-label="Tài nguyên"><strong>{String(event.resourceType)}</strong><small>{event.resourceId ? String(event.resourceId) : 'Không gắn ID'}</small></td>
              <td data-label="Role">{event.actorRole ? String(event.actorRole) : 'Hệ thống'}</td>
              <td data-label="Kết quả"><PortalStatus value={event.outcome} /></td>
              <td data-label="Request ID"><code>{event.requestId ? String(event.requestId) : 'Không có'}</code></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <footer className="portal-status-line"><ShieldCheck aria-hidden="true" />Database chặn UPDATE và DELETE trực tiếp trên bảng audit_events.</footer>
    </div></main>
  );
}
