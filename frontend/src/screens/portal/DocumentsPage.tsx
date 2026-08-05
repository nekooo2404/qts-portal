import { Download, FileCheck2, FileText, Plus, RefreshCw, Search, Upload, X } from 'lucide-react';
import { type FormEvent, useDeferredValue, useState } from 'react';

import type { PortalSession } from '../../auth/types';
import { PortalEmptyState, PortalErrorState, PortalLoading } from '../../components/portal/PortalFeedback';
import { createResource, downloadDocument } from '../../portal/api';
import type { PortalRecord, TenantOption } from '../../portal/types';
import { usePortalCollection } from '../../portal/usePortalCollection';

interface DocumentsPageProps {
  canWrite: boolean;
  selectedTenantId?: string;
  session: PortalSession;
  tenants: TenantOption[];
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Chưa phát hành';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function contentBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp đã chọn.'));
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== 'string' || !value.includes(',')) {
        reject(new Error('Không thể chuyển tệp sang định dạng truyền tải.'));
        return;
      }
      resolve(value.slice(value.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

function UploadForm({ onClose, onCreated, props }: {
  onClose: () => void;
  onCreated: (message: string) => void;
  props: DocumentsPageProps;
}) {
  const { selectedTenantId, session, tenants } = props;
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setMessage('Cần chọn một tệp hợp lệ.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Tệp vượt quá giới hạn 10 MiB.');
      return;
    }
    const allowed = new Set(['application/pdf', 'text/plain', 'text/markdown']);
    const mediaType = file.type || (file.name.endsWith('.md') ? 'text/markdown' : '');
    if (!allowed.has(mediaType)) {
      setMessage('Chỉ chấp nhận PDF, TXT hoặc Markdown.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const body: Record<string, unknown> = {
        type: values.get('type'),
        title: values.get('title'),
        description: values.get('description'),
        filename: file.name,
        mediaType,
        contentBase64: await contentBase64(file),
      };
      const tenantId = values.get('tenantId');
      if (typeof tenantId === 'string' && tenantId) body.tenantId = tenantId;
      await createResource('documents', body, session.csrfToken);
      onCreated(`Đã tải lên ${file.name}.`);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải tài liệu lên.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="portal-form-panel" aria-labelledby="upload-title">
      <header><div><p className="portal-eyebrow">Tối đa 10 MiB · Có checksum</p><h2 id="upload-title">Tải tài liệu lên</h2></div>
        <button className="portal-icon-button" onClick={onClose} title="Đóng biểu mẫu" type="button"><X aria-hidden="true" /><span className="sr-only">Đóng</span></button>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        {session.authorization.workspace === 'internal' && (
          <label className="portal-field"><span>Tenant</span>
            <select defaultValue={selectedTenantId ?? ''} name="tenantId" required>
              <option disabled value="">Chọn tenant</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
        )}
        <label className="portal-field"><span>Loại tài liệu</span>
          <select defaultValue="SECURITY_REPORT" name="type" required>
            <option value="SECURITY_REPORT">Báo cáo an ninh</option><option value="COMPLIANCE_REPORT">Báo cáo tuân thủ</option>
            <option value="INVOICE_ATTACHMENT">Tài liệu hóa đơn</option><option value="OTHER">Khác</option>
          </select>
        </label>
        <label className="portal-field portal-field--wide"><span>Tiêu đề</span><input maxLength={180} minLength={2} name="title" required /></label>
        <label className="portal-field portal-field--wide"><span>Mô tả</span><textarea maxLength={2000} name="description" rows={3} /></label>
        <label className="portal-field portal-field--wide"><span>Tệp</span><input accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" name="file" required type="file" /><small>PDF, TXT hoặc Markdown; tối đa 10 MiB.</small></label>
        <div className="portal-form-panel__footer"><span role={message ? 'alert' : undefined}>{message}</span>
          <button className="portal-button portal-button--primary" disabled={submitting} type="submit"><Upload aria-hidden="true" />{submitting ? 'Đang tải lên' : 'Tải lên'}</button>
        </div>
      </form>
    </section>
  );
}

function DocumentRow({ document, onError }: { document: PortalRecord; onError: (message: string) => void }) {
  const [downloading, setDownloading] = useState(false);
  async function download() {
    setDownloading(true);
    onError('');
    try {
      const result = await downloadDocument(document.id);
      const url = URL.createObjectURL(result.blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể tải tài liệu.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article>
      <FileText aria-hidden="true" />
      <div>
        <strong>{String(document.title)}</strong>
        <span>{String(document.filename)} · {Number(document.byteSize).toLocaleString('vi-VN')} byte</span>
        <p>{document.description ? String(document.description) : 'Không có mô tả bổ sung.'}</p>
      </div>
      <div>
        <span>{formatDate(document.publishedAt ?? document.createdAt)}</span>
        <button className="portal-button portal-button--secondary" disabled={downloading} onClick={() => void download()} type="button">
          <Download aria-hidden="true" />{downloading ? 'Đang tải' : 'Tải xuống'}
        </button>
      </div>
    </article>
  );
}

export default function DocumentsPage(props: DocumentsPageProps) {
  const { canWrite, selectedTenantId } = props;
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const collection = usePortalCollection('documents', { search: deferredQuery, tenantId: selectedTenantId });

  return (
    <main className="portal-main" id="portal-main"><div className="portal-page">
      <header className="portal-page-header">
        <div><p className="portal-eyebrow">Hồ sơ dịch vụ · Tài liệu</p><h1>Tài liệu dịch vụ</h1><p>Báo cáo, biên bản và tài liệu bàn giao được kiểm tra định dạng, checksum và quyền tải xuống.</p></div>
        <div className="portal-page-header__actions">
          <button className="portal-icon-button" onClick={collection.reload} title="Tải lại tài liệu" type="button"><RefreshCw aria-hidden="true" /><span className="sr-only">Tải lại</span></button>
          {canWrite && <button className="portal-button portal-button--primary" onClick={() => setFormOpen(true)} type="button"><Plus aria-hidden="true" /> Tải lên</button>}
        </div>
      </header>
      {formOpen && <UploadForm onClose={() => setFormOpen(false)} onCreated={(value) => { setMessage(value); collection.reload(); }} props={props} />}
      <div className="portal-filter-bar" role="search" aria-label="Lọc tài liệu">
        <label className="portal-search-field"><Search aria-hidden="true" /><span className="sr-only">Tìm tài liệu</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tiêu đề hoặc tên tệp" type="search" value={query} /></label>
        <output>{collection.data.pagination.totalItems} tài liệu</output>
      </div>
      <p className="portal-action-status" aria-live="polite">{message}</p>
      {collection.loading ? <PortalLoading /> : collection.error ? <PortalErrorState error={collection.error} onRetry={collection.reload} /> : collection.data.data.length === 0 ? (
        <PortalEmptyState title="Chưa có tài liệu" description="Chưa có tài liệu nào được phát hành cho phạm vi hiện tại." />
      ) : (
        <div className="portal-document-list">{collection.data.data.map((document) => <DocumentRow document={document} key={document.id} onError={setMessage} />)}</div>
      )}
      <footer className="portal-status-line"><FileCheck2 aria-hidden="true" />Mỗi lượt tải xuống được ghi vào audit log cùng checksum SHA-256 của tệp.</footer>
    </div></main>
  );
}
