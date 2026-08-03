import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Server, ShieldAlert, TicketCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { PortalEmptyState, PortalErrorState, PortalLoading } from '../../components/portal/PortalFeedback';
import { PortalStatus } from '../../components/portal/PortalStatus';
import { getOverview } from '../../portal/api';
import type { LoadState, PortalOverview, PortalRecord, ThreatPoint } from '../../portal/types';

function formatTime(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Chưa có thời gian';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function formatChartDay(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function linePoints(series: ThreatPoint[], key: keyof Pick<ThreatPoint, 'critical' | 'high' | 'medium' | 'low'>, max: number) {
  return series.map((point, index) => {
    const x = series.length === 1 ? 350 : 24 + (index * 652) / Math.max(1, series.length - 1);
    const y = 212 - (point[key] / max) * 180;
    return `${x},${y}`;
  }).join(' ');
}

function ThreatChart({ data }: { data: ThreatPoint[] }) {
  const max = Math.max(1, ...data.flatMap((point) => [point.critical, point.high, point.medium, point.low]));
  const totals = data.reduce(
    (result, point) => ({
      critical: result.critical + point.critical,
      high: result.high + point.high,
      medium: result.medium + point.medium,
      low: result.low + point.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
  return (
    <section className="portal-chart-panel" aria-labelledby="threat-chart-title">
      <header>
        <div>
          <p className="portal-eyebrow">7 ngày gần nhất</p>
          <h2 id="threat-chart-title">Xu hướng cảnh báo</h2>
        </div>
        <span>Tối đa {max} / ngày</span>
      </header>
      <div className="portal-chart">
        <svg aria-describedby="threat-chart-description" role="img" viewBox="0 0 700 240">
          <title>Biểu đồ số cảnh báo theo mức độ trong bảy ngày</title>
          <desc id="threat-chart-description">Dữ liệu tổng hợp trực tiếp từ cảnh báo đã lưu trong PostgreSQL.</desc>
          {[32, 77, 122, 167, 212].map((y) => (
            <line className="portal-chart__grid" key={y} x1="24" x2="676" y1={y} y2={y} />
          ))}
          <polyline className="portal-chart__line portal-chart__line--critical" points={linePoints(data, 'critical', max)} />
          <polyline className="portal-chart__line portal-chart__line--high" points={linePoints(data, 'high', max)} />
          <polyline className="portal-chart__line portal-chart__line--medium" points={linePoints(data, 'medium', max)} />
          <polyline className="portal-chart__line portal-chart__line--low" points={linePoints(data, 'low', max)} />
          {data.map((point, index) => {
            const x = data.length === 1 ? 350 : 24 + (index * 652) / Math.max(1, data.length - 1);
            return <text className="portal-chart__label" key={point.day} textAnchor="middle" x={x} y="235">{formatChartDay(point.day)}</text>;
          })}
        </svg>
      </div>
      <ul className="portal-chart-legend">
        <li><span>Nghiêm trọng</span><strong>{totals.critical}</strong></li>
        <li><span>Cao</span><strong>{totals.high}</strong></li>
        <li><span>Trung bình</span><strong>{totals.medium}</strong></li>
        <li><span>Thấp / thông tin</span><strong>{totals.low}</strong></li>
      </ul>
    </section>
  );
}

function RecentAlerts({ records }: { records: PortalRecord[] }) {
  return (
    <section className="portal-section portal-section--critical" aria-labelledby="recent-alerts-title">
      <header className="portal-section__header">
        <div><p className="portal-eyebrow">Ưu tiên xử lý</p><h2 id="recent-alerts-title">Cảnh báo gần nhất</h2></div>
        <ShieldAlert aria-hidden="true" />
      </header>
      {records.length === 0 ? (
        <PortalEmptyState title="Không có cảnh báo mở" description="Chưa có sự kiện nào trong phạm vi hiện tại." />
      ) : (
        <div className="portal-alert-list">
          {records.map((record) => (
            <article key={record.id}>
              <span className="portal-alert-list__severity" data-tone={record.severity === 'CRITICAL' ? 'critical' : 'warning'}>
                <AlertTriangle aria-hidden="true" />
              </span>
              <div>
                <span>{typeof record.tenantName === 'string' ? record.tenantName : 'Tenant hiện tại'} · {formatTime(record.detectedAt)}</span>
                <strong>{String(record.title)}</strong>
                <p>{typeof record.source === 'string' ? record.source : 'Nguồn chưa xác định'}</p>
              </div>
              <div className="portal-alert-list__meta">
                <PortalStatus value={record.severity} />
                <small>{String(record.status)}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentTickets({ records }: { records: PortalRecord[] }) {
  return (
    <section className="portal-section" aria-labelledby="recent-tickets-title">
      <header className="portal-section__header">
        <div><p className="portal-eyebrow">SLA & hỗ trợ</p><h2 id="recent-tickets-title">Ticket gần nhất</h2></div>
        <TicketCheck aria-hidden="true" />
      </header>
      {records.length === 0 ? (
        <PortalEmptyState title="Không có ticket đang hoạt động" description="Chưa có yêu cầu hỗ trợ nào trong phạm vi hiện tại." />
      ) : (
        <div className="portal-record-list portal-record-list--compact">
          {records.map((record) => (
            <article key={record.id}>
              <span className="portal-record-list__icon" data-tone={record.severity === 'CRITICAL' ? 'critical' : 'info'}>
                <TicketCheck aria-hidden="true" />
              </span>
              <div className="portal-record-list__body">
                <div className="portal-record-list__heading">
                  <span>{record.reference ? String(record.reference) : record.id}</span>
                  <time>{formatTime(record.createdAt)}</time>
                </div>
                <h2>{String(record.subject)}</h2>
                <dl>
                  <div><dt>Trạng thái</dt><dd><PortalStatus value={record.status} /></dd></div>
                  <div><dt>SLA đến hạn</dt><dd>{record.dueAt ? formatTime(record.dueAt) : 'Chưa cấu hình SLA'}</dd></div>
                  <div><dt>Phụ trách</dt><dd>{record.assignee ? String(record.assignee) : 'Chưa phân công'}</dd></div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function OverviewPage({ selectedTenantId }: { selectedTenantId?: string }) {
  const [state, setState] = useState<LoadState<PortalOverview>>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void getOverview(selectedTenantId, controller.signal).then(
      (data) => { if (active) setState({ status: 'ready', data }); },
      (error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ status: 'error', error: error instanceof Error ? error : new Error('Unknown error') });
        }
      },
    );
    const poll = window.setInterval(reload, 30_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(poll);
    };
  }, [reload, revision, selectedTenantId]);

  if (state.status === 'loading') return <main className="portal-main" id="portal-main"><PortalLoading label="Đang tổng hợp dashboard" /></main>;
  if (state.status === 'error') return <main className="portal-main" id="portal-main"><PortalErrorState error={state.error} onRetry={reload} /></main>;

  const { data } = state;
  const healthyPercent = data.metrics.totalAssets === 0
    ? 0
    : Math.round((data.metrics.healthyAssets / data.metrics.totalAssets) * 100);
  const scopeLabel = data.scope.kind === 'ALL_TENANTS'
    ? `${data.scope.tenantCount ?? 0} tenant`
    : data.scope.name ?? data.scope.id ?? 'Tenant hiện tại';

  return (
    <main className="portal-main" id="portal-main">
      <div className="portal-page">
        <header className="portal-page-header">
          <div>
            <p className="portal-eyebrow">Security operations · {scopeLabel}</p>
            <h1>Tổng quan an ninh</h1>
            <p>Trạng thái hiện tại được tổng hợp từ dữ liệu vận hành đã lưu, cập nhật tự động mỗi 30 giây.</p>
          </div>
          <div className="portal-page-header__actions">
            <span className="portal-status" data-tone="healthy"><span className="portal-status__mark" />Cập nhật {formatTime(data.generatedAt)}</span>
            <button className="portal-icon-button" onClick={reload} title="Làm mới dashboard" type="button">
              <RefreshCw aria-hidden="true" /><span className="sr-only">Làm mới dashboard</span>
            </button>
          </div>
        </header>

        <section className="portal-metric-strip" aria-label="Chỉ số an ninh chính">
          <article className="portal-metric" data-tone={data.metrics.criticalAlerts > 0 ? 'critical' : 'healthy'}>
            <span>Cảnh báo nghiêm trọng</span><strong>{data.metrics.criticalAlerts}</strong><small>{data.metrics.openAlerts} cảnh báo đang mở</small>
          </article>
          <article className="portal-metric" data-tone={data.metrics.slaBreached > 0 ? 'critical' : 'healthy'}>
            <span>Ticket hoạt động</span><strong>{data.metrics.activeTickets}</strong><small>{data.metrics.slaBreached} ticket vi phạm SLA</small>
          </article>
          <article className="portal-metric" data-tone={healthyPercent === 100 ? 'healthy' : data.metrics.totalAssets > 0 ? 'warning' : undefined}>
            <span>Sức khỏe tài sản</span><strong>{healthyPercent}%</strong><small>{data.metrics.healthyAssets} / {data.metrics.totalAssets} tài sản khỏe</small>
          </article>
          <article className="portal-metric" data-tone={data.metrics.expiringLicenses > 0 ? 'warning' : 'healthy'}>
            <span>License sắp hết hạn</span><strong>{data.metrics.expiringLicenses}</strong><small>{data.metrics.unpaidInvoices} hóa đơn chưa thanh toán</small>
          </article>
        </section>

        <div className="portal-chart-grid">
          <ThreatChart data={data.threatSeries} />
          <section className="portal-chart-panel" aria-labelledby="health-title">
            <header><div><p className="portal-eyebrow">Infrastructure</p><h2 id="health-title">Sức khỏe tài sản</h2></div><Server aria-hidden="true" /></header>
            {data.assetHealth.length === 0 ? (
              <PortalEmptyState title="Chưa có tài sản" description="Chưa có nguồn dữ liệu sức khỏe trong tenant này." />
            ) : (
              <ul className="portal-health-list">
                {data.assetHealth.map((item) => (
                  <li key={item.healthStatus}>
                    <div><strong>{String(item.healthStatus)}</strong><small><CheckCircle2 aria-hidden="true" />Trạng thái ghi nhận</small></div>
                    <div><span>{item.count} tài sản</span></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="portal-content-grid portal-content-grid--wide-left">
          <RecentAlerts records={data.recentAlerts} />
          <RecentTickets records={data.recentTickets} />
        </div>
        <footer className="portal-status-line"><Clock3 aria-hidden="true" />Không có số liệu nào được tạo ở frontend; số 0 là kết quả truy vấn thực tế.</footer>
      </div>
    </main>
  );
}
