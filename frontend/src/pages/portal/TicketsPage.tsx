import { Clock3, MessageSquare, Plus, RefreshCw, Search, Send, X } from 'lucide-react';
import { type FormEvent, useDeferredValue, useEffect, useRef, useState } from 'react';

import type { PortalSession } from '../../auth/types';
import { PortalEmptyState, PortalErrorState, PortalLoading } from '../../components/portal/PortalFeedback';
import { PortalStatus } from '../../components/portal/PortalStatus';
import { createResource, createTicketComment, listTicketComments, updateResource } from '../../portal/api';
import type { LoadState, PortalRecord, TenantOption } from '../../portal/types';
import { usePortalCollection } from '../../portal/usePortalCollection';

interface TicketsPageProps {
  canCreate: boolean;
  canManage: boolean;
  selectedTenantId?: string;
  session: PortalSession;
  tenants: TenantOption[];
}

function formatTime(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function TicketCreateForm({ props, onClose, onCreated }: {
  props: TicketsPageProps;
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const { selectedTenantId, session, tenants } = props;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());
  const isInternal = session.authorization.workspace === 'internal';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const tenantId = values.get('tenantId');
    const body: Record<string, unknown> = {
      subject: values.get('subject'),
      description: values.get('description'),
      category: values.get('category'),
      severity: values.get('severity'),
    };
    if (typeof tenantId === 'string' && tenantId) body.tenantId = tenantId;
    setSubmitting(true);
    setError('');
    try {
      const created = await createResource('tickets', body, session.csrfToken, idempotencyKey.current);
      idempotencyKey.current = crypto.randomUUID();
      onCreated(`Đã tạo ${created.reference ? String(created.reference) : 'ticket mới'}.`);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tạo ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="portal-form-panel" aria-labelledby="ticket-create-title">
      <header>
        <div><p className="portal-eyebrow">Kênh hỗ trợ có kiểm toán</p><h2 id="ticket-create-title">Tạo ticket mới</h2></div>
        <button className="portal-icon-button" onClick={onClose} title="Đóng biểu mẫu" type="button"><X aria-hidden="true" /><span className="sr-only">Đóng</span></button>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        {isInternal && (
          <label className="portal-field"><span>Tenant</span>
            <select defaultValue={selectedTenantId ?? ''} name="tenantId" required>
              <option disabled value="">Chọn tenant</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
        )}
        <label className="portal-field"><span>Loại yêu cầu</span>
          <select defaultValue="INCIDENT" name="category" required>
            <option value="INCIDENT">Sự cố an ninh</option><option value="SERVICE_REQUEST">Yêu cầu dịch vụ</option>
            <option value="CHANGE_REQUEST">Yêu cầu thay đổi</option><option value="BILLING">Thanh toán</option>
          </select>
        </label>
        <label className="portal-field"><span>Mức độ</span>
          <select defaultValue="MEDIUM" name="severity" required>
            <option value="CRITICAL">Nghiêm trọng</option><option value="HIGH">Cao</option>
            <option value="MEDIUM">Trung bình</option><option value="LOW">Thấp</option>
          </select>
        </label>
        <label className="portal-field portal-field--wide"><span>Tiêu đề</span><input maxLength={180} minLength={3} name="subject" required /></label>
        <label className="portal-field portal-field--wide"><span>Mô tả chi tiết</span><textarea maxLength={10000} minLength={5} name="description" required rows={6} /></label>
        <div className="portal-form-panel__footer">
          <span role={error ? 'alert' : undefined}>{error}</span>
          <button className="portal-button portal-button--primary" disabled={submitting} type="submit">
            <Send aria-hidden="true" /> {submitting ? 'Đang gửi' : 'Gửi ticket'}
          </button>
        </div>
      </form>
    </section>
  );
}

function TicketDetail({ canComment, canManage, onChanged, session, ticket }: {
  canComment: boolean;
  canManage: boolean;
  onChanged: () => void;
  session: PortalSession;
  ticket: PortalRecord;
}) {
  const [comments, setComments] = useState<LoadState<PortalRecord[]>>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    let active = true;
    void listTicketComments(ticket.id).then(
      (data) => { if (active) setComments({ status: 'ready', data }); },
      (error: unknown) => { if (active) setComments({ status: 'error', error: error instanceof Error ? error : new Error('Unknown error') }); },
    );
    return () => { active = false; };
  }, [revision, ticket.id]);

  async function updateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await updateResource('tickets', ticket.id, {
        status: values.get('status'),
        severity: values.get('severity'),
        assignee: values.get('assignee'),
        expectedVersion: ticket.version,
      }, session.csrfToken);
      setActionMessage('Đã cập nhật workflow ticket.');
      onChanged();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Không thể cập nhật ticket.');
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await createTicketComment(ticket.id, {
        body: values.get('body'),
        visibility: values.get('visibility') ?? 'CUSTOMER',
      }, session.csrfToken);
      form.reset();
      setActionMessage('Đã thêm phản hồi.');
      setRevision((value) => value + 1);
      onChanged();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Không thể thêm phản hồi.');
    }
  }

  return (
    <aside className="portal-detail-panel portal-ticket-detail" aria-labelledby="ticket-detail-title">
      <p className="portal-eyebrow">{ticket.reference ? String(ticket.reference) : ticket.id}</p>
      <h2 id="ticket-detail-title">{String(ticket.subject)}</h2>
      <p>{String(ticket.description)}</p>
      <dl>
        <div><dt>Trạng thái</dt><dd><PortalStatus value={ticket.status} /></dd></div>
        <div><dt>Mức độ</dt><dd><PortalStatus value={ticket.severity} /></dd></div>
        <div><dt>Người báo</dt><dd>{String(ticket.reporterName)}</dd></div>
        <div><dt>Phụ trách</dt><dd>{ticket.assignee ? String(ticket.assignee) : 'Chưa phân công'}</dd></div>
        <div><dt>Hạn SLA</dt><dd>{ticket.dueAt ? formatTime(ticket.dueAt) : 'Chưa cấu hình'}</dd></div>
      </dl>

      {canManage && (
        <form className="portal-ticket-actions" onSubmit={(event) => void updateTicket(event)}>
          <label className="portal-field"><span>Trạng thái</span>
            <select defaultValue={String(ticket.status)} name="status">
              <option value="OPEN">Mở</option><option value="ACKNOWLEDGED">Đã tiếp nhận</option>
              <option value="IN_PROGRESS">Đang xử lý</option><option value="WAITING_CUSTOMER">Chờ khách hàng</option>
              <option value="RESOLVED">Đã xử lý</option><option value="CLOSED">Đã đóng</option>
            </select>
          </label>
          <label className="portal-field"><span>Mức độ</span>
            <select defaultValue={String(ticket.severity)} name="severity">
              <option value="CRITICAL">Nghiêm trọng</option><option value="HIGH">Cao</option>
              <option value="MEDIUM">Trung bình</option><option value="LOW">Thấp</option>
            </select>
          </label>
          <label className="portal-field portal-field--wide"><span>Người phụ trách</span><input defaultValue={ticket.assignee ? String(ticket.assignee) : ''} name="assignee" required /></label>
          <button className="portal-button portal-button--secondary" type="submit">Cập nhật workflow</button>
        </form>
      )}

      <section className="portal-ticket-thread" aria-labelledby="ticket-comments-title">
        <h3 id="ticket-comments-title"><MessageSquare aria-hidden="true" /> Trao đổi</h3>
        {comments.status === 'loading' ? <PortalLoading label="Đang tải phản hồi" /> : comments.status === 'error' ? (
          <PortalErrorState error={comments.error} onRetry={() => setRevision((value) => value + 1)} />
        ) : comments.data.length === 0 ? (
          <p className="portal-muted">Chưa có phản hồi nào.</p>
        ) : (
          <ol>
            {comments.data.map((comment) => (
              <li key={comment.id}>
                <header><strong>{String(comment.authorName)}</strong><time>{formatTime(comment.createdAt)}</time></header>
                <p>{String(comment.body)}</p><small>{comment.visibility === 'INTERNAL' ? 'Nội bộ QTS' : 'Khách hàng có thể xem'}</small>
              </li>
            ))}
          </ol>
        )}
      </section>

      {canComment && (
        <form className="portal-ticket-comment-form" onSubmit={(event) => void addComment(event)}>
          <label className="portal-field"><span>Phản hồi</span><textarea minLength={2} name="body" required rows={4} /></label>
          {session.authorization.workspace === 'internal' && (
            <label className="portal-field"><span>Phạm vi</span>
              <select defaultValue="CUSTOMER" name="visibility"><option value="CUSTOMER">Khách hàng</option><option value="INTERNAL">Chỉ nội bộ QTS</option></select>
            </label>
          )}
          <button className="portal-button portal-button--primary" type="submit"><Send aria-hidden="true" /> Gửi phản hồi</button>
        </form>
      )}
      <p className="portal-action-status" aria-live="polite">{actionMessage}</p>
    </aside>
  );
}

export default function TicketsPage(props: TicketsPageProps) {
  const { canCreate, canManage, selectedTenantId, session } = props;
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [message, setMessage] = useState('');
  const collection = usePortalCollection('tickets', { search: deferredQuery, tenantId: selectedTenantId });
  const selected = collection.data.data.find((record) => record.id === selectedId) ?? collection.data.data[0];

  return (
    <main className="portal-main" id="portal-main">
      <div className="portal-page">
        <header className="portal-page-header">
          <div><p className="portal-eyebrow">Incident management · SLA</p><h1>Ticket & xử lý sự cố</h1><p>Kênh trao đổi tập trung giữa khách hàng và SOC, có theo dõi deadline và nhật ký đầy đủ.</p></div>
          <div className="portal-page-header__actions">
            <button className="portal-icon-button" onClick={collection.reload} title="Tải lại ticket" type="button"><RefreshCw aria-hidden="true" /><span className="sr-only">Tải lại</span></button>
            {canCreate && <button className="portal-button portal-button--primary" onClick={() => setFormOpen(true)} type="button"><Plus aria-hidden="true" /> Tạo ticket</button>}
          </div>
        </header>

        {formOpen && <TicketCreateForm onClose={() => setFormOpen(false)} onCreated={(value) => { setMessage(value); collection.reload(); }} props={props} />}
        <p className="portal-action-status" aria-live="polite">{message}</p>

        <div className="portal-filter-bar">
          <label className="portal-search-field"><Search aria-hidden="true" /><span className="sr-only">Tìm ticket</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tiêu đề, mô tả hoặc người phụ trách" type="search" value={query} /></label>
          <output>{collection.data.pagination.totalItems} ticket</output>
        </div>

        {collection.loading ? <PortalLoading /> : collection.error ? (
          <PortalErrorState error={collection.error} onRetry={collection.reload} />
        ) : collection.data.data.length === 0 ? (
          <PortalEmptyState title="Chưa có ticket" description="Tạo ticket khi cần QTS hỗ trợ hoặc xử lý sự cố." />
        ) : (
          <div className="portal-content-grid portal-content-grid--wide-left">
            <section className="portal-table-wrap" aria-label="Danh sách ticket">
              <table className="portal-table">
                <thead><tr><th>Ticket</th><th>Khách hàng</th><th>Mức độ</th><th>Trạng thái</th><th>SLA</th></tr></thead>
                <tbody>
                  {collection.data.data.map((ticket) => (
                    <tr data-selected={ticket.id === selected?.id} key={ticket.id}>
                      <th data-label="Ticket" scope="row">
                        <button className="portal-table-link" onClick={() => setSelectedId(ticket.id)} type="button">
                          <strong>{String(ticket.subject)}</strong><small>{ticket.reference ? String(ticket.reference) : ticket.id}</small>
                        </button>
                      </th>
                      <td data-label="Khách hàng">{ticket.tenantName ? String(ticket.tenantName) : session.authorization.tenantId}</td>
                      <td data-label="Mức độ"><PortalStatus value={ticket.severity} /></td>
                      <td data-label="Trạng thái"><PortalStatus value={ticket.status} /></td>
                      <td data-label="SLA">{ticket.dueAt ? formatTime(ticket.dueAt) : 'Chưa cấu hình'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            {selected && (
              <TicketDetail
                canComment={canCreate}
                canManage={canManage}
                key={`${selected.id}:${String(selected.version)}`}
                onChanged={collection.reload}
                session={session}
                ticket={selected}
              />
            )}
          </div>
        )}
        <footer className="portal-status-line"><Clock3 aria-hidden="true" />SLA chỉ hiển thị khi tenant đã được cấu hình chính sách thời gian phản hồi.</footer>
      </div>
    </main>
  );
}
