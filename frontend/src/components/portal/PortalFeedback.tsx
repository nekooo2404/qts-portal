import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

export function PortalLoading({ label = 'Đang tải dữ liệu' }: { label?: string }) {
  return (
    <div className="portal-state" role="status">
      <div className="portal-state__skeleton" aria-hidden="true">
        <Skeleton className="portal-skeleton--heading" />
        <Skeleton />
        <Skeleton />
      </div>
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
      <Button onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" /> Thử lại
      </Button>
    </div>
  );
}

export function PortalEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="portal-empty-state">
      <span className="portal-empty-state__icon"><Inbox aria-hidden="true" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
