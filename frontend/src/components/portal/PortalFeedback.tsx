import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';

export function PortalLoading({ label = 'Đang tải dữ liệu' }: { label?: string }) {
  return (
    <div className="portal-state" role="status">
      <LoaderCircle className="portal-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function PortalErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="portal-state" role="alert">
      <AlertTriangle aria-hidden="true" />
      <strong>Không thể tải dữ liệu</strong>
      <p>{error.message}</p>
      <button className="portal-button portal-button--secondary" onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" /> Thử lại
      </button>
    </div>
  );
}

export function PortalEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="portal-empty-state">
      <Inbox aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
