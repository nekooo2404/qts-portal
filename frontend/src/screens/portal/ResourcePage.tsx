import { Database, Pencil, Plus, RefreshCw, Search, X } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import type { PortalSession } from '../../auth/types';
import { PortalEmptyState, PortalErrorState, PortalLoading } from '../../components/portal/PortalFeedback';
import { PortalStatus } from '../../components/portal/PortalStatus';
import { createResource, updateResource } from '../../portal/api';
import type { ResourceDefinition, ResourceField } from '../../portal/resource-config';
import type { PortalRecord, TenantOption } from '../../portal/types';
import { usePortalCollection } from '../../portal/usePortalCollection';

interface ResourcePageProps {
  canWrite: boolean;
  definition: ResourceDefinition;
  selectedTenantId?: string;
  session: PortalSession;
  tenants: TenantOption[];
}

function localDateTime(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialValue(field: ResourceField, record: PortalRecord | null, defaults: Record<string, string>): string {
  const value = record?.[field.name] ?? defaults[field.name] ?? '';
  if (field.type === 'datetime-local') return localDateTime(value);
  if (field.type === 'date' && typeof value === 'string') return value.slice(0, 10);
  return value === null || value === undefined ? '' : String(value);
}

function displayValue(record: PortalRecord, key: string, format = 'text') {
  const value = record[key];
  if (format === 'status') return <PortalStatus value={value} />;
  if (value === null || value === undefined || value === '') return <span aria-label="Chưa có dữ liệu">—</span>;
  if (format === 'date' && typeof value === 'string') {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  }
  if (format === 'datetime' && typeof value === 'string') {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }
  if (format === 'money') {
    const amount = Number(value);
    const currency = typeof record.currency === 'string' ? record.currency : 'VND';
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount)
      : String(value);
  }
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}

function payloadFromForm(form: HTMLFormElement, fields: ResourceField[]): Record<string, unknown> {
  const formData = new FormData(form);
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.get(field.name);
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    if (field.type === 'number') payload[field.name] = Number(raw);
    else if (field.type === 'datetime-local') payload[field.name] = new Date(raw).toISOString();
    else payload[field.name] = raw.trim();
  }
  return payload;
}

function ResourceForm({
  definition,
  editing,
  onCancel,
  onSaved,
  selectedTenantId,
  session,
  tenants,
}: Omit<ResourcePageProps, 'canWrite'> & {
  editing: PortalRecord | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const isInternal = session.authorization.workspace === 'internal';
  const isKnowledge = definition.resource === 'knowledge';
  const visibleFields = definition.fields.filter((field) => (
    editing ? !field.createOnly : !field.updateOnly
  ));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const payload = payloadFromForm(event.currentTarget, visibleFields);
      if (!editing && definition.resource !== 'tenants' && isInternal) {
        const tenantInput = new FormData(event.currentTarget).get('tenantId');
        if (typeof tenantInput === 'string' && tenantInput) payload.tenantId = tenantInput;
      }
      if (editing) {
        if (typeof editing.version !== 'number') throw new Error('Bản ghi không có version để cập nhật an toàn.');
        payload.expectedVersion = editing.version;
        await updateResource(definition.resource, editing.id, payload, session.csrfToken);
      } else {
        await createResource(definition.resource, payload, session.csrfToken);
      }
      setMessage(editing ? 'Đã cập nhật bản ghi.' : 'Đã tạo bản ghi mới.');
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu bản ghi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="portal-form-panel" aria-label={editing ? 'Cập nhật bản ghi' : definition.createLabel}>
      <header>
        <div>
          <p className="portal-eyebrow">{editing ? 'Cập nhật có kiểm soát phiên bản' : 'Ghi dữ liệu vận hành'}</p>
          <h2>{editing ? `Cập nhật ${definition.title.toLowerCase()}` : definition.createLabel}</h2>
        </div>
        <button className="portal-icon-button" onClick={onCancel} title="Đóng biểu mẫu" type="button">
          <X aria-hidden="true" /><span className="sr-only">Đóng biểu mẫu</span>
        </button>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        {!editing && isInternal && definition.resource !== 'tenants' && (
          <label className="portal-field">
            <span>Tenant</span>
            <select
              defaultValue={selectedTenantId ?? ''}
              name="tenantId"
              required={!isKnowledge}
            >
              <option value="">{isKnowledge ? 'Nội dung dùng chung' : 'Chọn tenant'}</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
        )}
        {visibleFields.map((field) => (
          <label className={`portal-field${field.wide ? ' portal-field--wide' : ''}`} key={field.name}>
            <span>{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea
                defaultValue={initialValue(field, editing, definition.defaultValues ?? {})}
                name={field.name}
                required={field.required}
                rows={field.name === 'body' ? 8 : 4}
              />
            ) : field.type === 'select' ? (
              <select
                defaultValue={initialValue(field, editing, definition.defaultValues ?? {})}
                name={field.name}
                required={field.required}
              >
                <option disabled={field.required} value="">Chọn giá trị</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                defaultValue={initialValue(field, editing, definition.defaultValues ?? {})}
                max={field.max}
                min={field.min}
                name={field.name}
                required={field.required}
                step={field.step}
                type={field.type ?? 'text'}
              />
            )}
          </label>
        ))}
        <div className="portal-form-panel__footer">
          <span aria-live="polite">{message}</span>
          <button className="portal-button portal-button--primary" disabled={submitting} type="submit">
            {submitting ? 'Đang lưu' : editing ? 'Lưu thay đổi' : definition.createLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function ResourcePage(props: ResourcePageProps) {
  const { canWrite, definition, selectedTenantId, session } = props;
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PortalRecord | null>(null);
  const collection = usePortalCollection(definition.resource, {
    search: query,
    tenantId: selectedTenantId,
  });
  const visibleColumns = useMemo(
    () => definition.columns.filter((column) => column.key !== 'tenantName' || session.authorization.workspace === 'internal'),
    [definition.columns, session.authorization.workspace],
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(record: PortalRecord) {
    setEditing(record);
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setFormOpen(false);
  }

  return (
    <main className="portal-main" id="portal-main">
      <div className="portal-page">
        <header className="portal-page-header">
          <div>
            <p className="portal-eyebrow">{definition.eyebrow}</p>
            <h1>{definition.title}</h1>
            <p>{definition.description}</p>
          </div>
          <div className="portal-page-header__actions">
            <button className="portal-icon-button" onClick={collection.reload} title="Tải lại dữ liệu" type="button">
              <RefreshCw aria-hidden="true" /><span className="sr-only">Tải lại dữ liệu</span>
            </button>
            {canWrite && (
              <button className="portal-button portal-button--primary" onClick={openCreate} type="button">
                <Plus aria-hidden="true" /> {definition.createLabel}
              </button>
            )}
          </div>
        </header>

        {formOpen && (
          <ResourceForm
            {...props}
            editing={editing}
            onCancel={closeForm}
            onSaved={() => {
              collection.reload();
              closeForm();
            }}
          />
        )}

        <div className="portal-filter-bar" role="search" aria-label={`Lọc ${definition.title.toLowerCase()}`}>
          <label className="portal-search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm kiếm</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Tìm trong ${definition.title.toLowerCase()}`}
              type="search"
              value={query}
            />
          </label>
          <output>{collection.data.pagination.totalItems} bản ghi</output>
        </div>

        {collection.loading ? <PortalLoading /> : collection.error ? (
          <PortalErrorState error={collection.error} onRetry={collection.reload} />
        ) : collection.data.data.length === 0 ? (
          <PortalEmptyState title={definition.emptyTitle} description={definition.emptyDescription} />
        ) : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  {visibleColumns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
                  {canWrite && <th scope="col">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {collection.data.data.map((record) => (
                  <tr key={record.id}>
                    {visibleColumns.map((column, index) => (
                      index === 0 ? (
                        <th data-label={column.label} key={column.key} scope="row">
                          <strong>{displayValue(record, column.key, column.format)}</strong>
                          <small>{record.id}</small>
                        </th>
                      ) : (
                        <td data-label={column.label} key={column.key}>{displayValue(record, column.key, column.format)}</td>
                      )
                    ))}
                    {canWrite && (
                      <td data-label="Thao tác">
                        <button
                          className="portal-icon-button"
                          onClick={() => openEdit(record)}
                          title="Cập nhật bản ghi"
                          type="button"
                        >
                          <Pencil aria-hidden="true" /><span className="sr-only">Cập nhật bản ghi</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="portal-status-line">
          <Database aria-hidden="true" /> Dữ liệu được đọc trực tiếp từ PostgreSQL theo tenant scope của session.
        </footer>
      </div>
    </main>
  );
}
