import { KeyRound, MailPlus, RefreshCw, Save, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import type { PortalSession } from '../../auth/types';
import { PortalEmptyState, PortalErrorState, PortalLoading } from '../../components/portal/PortalFeedback';
import { PortalStatus } from '../../components/portal/PortalStatus';
import { createInvitation, listSpecialResource, updateMember } from '../../portal/api';
import type { CollectionResponse, LoadState, PortalRecord, TenantOption } from '../../portal/types';

interface TeamPageProps {
  canWrite: boolean;
  selectedTenantId?: string;
  session: PortalSession;
  tenants: TenantOption[];
}

const CLIENT_ROLES = [
  ['client_admin', 'Client admin'], ['client_viewer', 'Client viewer'],
  ['billing', 'Billing'], ['technical', 'Technical'],
] as const;
const INTERNAL_ROLES = [
  ['soc_l1', 'SOC L1'], ['soc_l2', 'SOC L2'], ['soc_l3', 'SOC L3'],
  ['account_manager', 'Account manager'], ['qts_admin', 'QTS admin'],
] as const;

function formatTime(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function MemberRow({ canWrite, member, onUpdated, session }: {
  canWrite: boolean;
  member: PortalRecord;
  onUpdated: (message: string) => void;
  session: PortalSession;
}) {
  const [role, setRole] = useState(String(member.role));
  const [status, setStatus] = useState(String(member.status));
  const [saving, setSaving] = useState(false);
  const roles = session.authorization.workspace === 'client'
    ? CLIENT_ROLES
    : [...CLIENT_ROLES, ...INTERNAL_ROLES];

  async function save() {
    if (typeof member.version !== 'number') {
      onUpdated('Không thể cập nhật thành viên không có version.');
      return;
    }
    setSaving(true);
    try {
      await updateMember(member.id, { role, status, expectedVersion: member.version }, session.csrfToken);
      onUpdated(`Đã cập nhật ${String(member.email)}; session cũ đã được thu hồi nếu quyền thay đổi.`);
    } catch (error) {
      onUpdated(error instanceof Error ? error.message : 'Không thể cập nhật thành viên.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <th data-label="Thành viên" scope="row"><strong>{member.displayName ? String(member.displayName) : 'Chưa đăng nhập'}</strong><small>{String(member.email)}</small></th>
      <td data-label="Tenant">{member.tenantName ? String(member.tenantName) : String(member.tenantId)}</td>
      <td data-label="Role">
        {canWrite ? <select aria-label={`Role của ${String(member.email)}`} onChange={(event) => setRole(event.target.value)} value={role}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : String(member.role)}
      </td>
      <td data-label="Trạng thái">
        {canWrite ? <select aria-label={`Trạng thái của ${String(member.email)}`} onChange={(event) => setStatus(event.target.value)} value={status}><option value="ACTIVE">Hoạt động</option><option value="DISABLED">Vô hiệu</option></select> : <PortalStatus value={member.status} />}
      </td>
      <td data-label="Đăng nhập cuối">{formatTime(member.lastLoginAt)}</td>
      {canWrite && <td data-label="Thao tác"><button className="portal-icon-button" disabled={saving || (role === member.role && status === member.status)} onClick={() => void save()} title="Lưu quyền thành viên" type="button"><Save aria-hidden="true" /><span className="sr-only">Lưu quyền</span></button></td>}
    </tr>
  );
}

function InvitationForm({ onClose, onCreated, props }: {
  onClose: () => void;
  onCreated: (message: string) => void;
  props: TeamPageProps;
}) {
  const { selectedTenantId, session, tenants } = props;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const roles = session.authorization.workspace === 'client'
    ? CLIENT_ROLES
    : [...CLIENT_ROLES, ...INTERNAL_ROLES];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      email: values.get('email'),
      role: values.get('role'),
      expiresAt: new Date(String(values.get('expiresAt'))).toISOString(),
    };
    const tenantId = values.get('tenantId');
    if (typeof tenantId === 'string' && tenantId) body.tenantId = tenantId;
    setSubmitting(true);
    setError('');
    try {
      await createInvitation(body, session.csrfToken);
      onCreated(`Đã cấp lời mời cho ${String(body.email)}.`);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tạo lời mời.');
    } finally {
      setSubmitting(false);
    }
  }

  const [localExpiry] = useState(() => {
    const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return new Date(defaultExpiry.getTime() - defaultExpiry.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  return (
    <section className="portal-form-panel" aria-labelledby="invite-title">
      <header><div><p className="portal-eyebrow">Google OIDC · Cấp quyền trước</p><h2 id="invite-title">Mời tài khoản</h2></div>
        <button className="portal-icon-button" onClick={onClose} title="Đóng biểu mẫu" type="button"><X aria-hidden="true" /><span className="sr-only">Đóng</span></button>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        {session.authorization.workspace === 'internal' && (
          <label className="portal-field"><span>Tenant</span><select defaultValue={selectedTenantId ?? ''} name="tenantId" required><option disabled value="">Chọn tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
        )}
        <label className="portal-field"><span>Email Google đã xác minh</span><input name="email" required type="email" /></label>
        <label className="portal-field"><span>Role</span><select defaultValue={roles[0][0]} name="role" required>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="portal-field"><span>Hết hạn lời mời</span><input defaultValue={localExpiry} name="expiresAt" required type="datetime-local" /></label>
        <div className="portal-form-panel__footer"><span role={error ? 'alert' : undefined}>{error}</span><button className="portal-button portal-button--primary" disabled={submitting} type="submit"><MailPlus aria-hidden="true" />{submitting ? 'Đang cấp' : 'Cấp lời mời'}</button></div>
      </form>
    </section>
  );
}

export default function TeamPage(props: TeamPageProps) {
  const { canWrite, selectedTenantId, session } = props;
  const [revision, setRevision] = useState(0);
  const [members, setMembers] = useState<LoadState<CollectionResponse>>({ status: 'loading' });
  const [invitations, setInvitations] = useState<LoadState<CollectionResponse>>({ status: 'loading' });
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.all([
      listSpecialResource('members', { tenantId: selectedTenantId, signal: controller.signal }),
      listSpecialResource('invitations', { tenantId: selectedTenantId, signal: controller.signal }),
    ]).then(
      ([memberData, invitationData]) => {
        if (!active) return;
        setMembers({ status: 'ready', data: memberData });
        setInvitations({ status: 'ready', data: invitationData });
      },
      (error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        const normalized = error instanceof Error ? error : new Error('Unknown error');
        setMembers({ status: 'error', error: normalized });
        setInvitations({ status: 'error', error: normalized });
      },
    );
    return () => { active = false; controller.abort(); };
  }, [revision, selectedTenantId]);

  const loading = members.status === 'loading' || invitations.status === 'loading';
  const error = members.status === 'error' ? members.error : invitations.status === 'error' ? invitations.error : null;
  const memberData = members.status === 'ready' ? members.data.data : [];
  const invitationData = invitations.status === 'ready' ? invitations.data.data : [];

  return (
    <main className="portal-main" id="portal-main"><div className="portal-page">
      <header className="portal-page-header">
        <div><p className="portal-eyebrow">IAM · RBAC · Session revocation</p><h1>Thành viên & phân quyền</h1><p>Cấp trước tenant và role; lần đăng nhập Google đầu tiên sẽ gắn email đã xác minh với cặp định danh iss + sub.</p></div>
        <div className="portal-page-header__actions"><button className="portal-icon-button" onClick={reload} title="Tải lại thành viên" type="button"><RefreshCw aria-hidden="true" /><span className="sr-only">Tải lại</span></button>{canWrite && <button className="portal-button portal-button--primary" onClick={() => setFormOpen(true)} type="button"><MailPlus aria-hidden="true" /> Mời tài khoản</button>}</div>
      </header>
      <div className="portal-access-note" role="note"><KeyRound aria-hidden="true" /><span>Email chỉ dùng để khớp lời mời ban đầu. Sau khi chấp nhận, hệ thống nhận diện người dùng bằng iss + sub; thay role hoặc vô hiệu hóa sẽ thu hồi session hiện có.</span></div>
      {formOpen && <InvitationForm onClose={() => setFormOpen(false)} onCreated={(value) => { setMessage(value); reload(); }} props={props} />}
      <p className="portal-action-status" aria-live="polite">{message}</p>
      {loading ? <PortalLoading /> : error ? <PortalErrorState error={error} onRetry={reload} /> : (
        <>
          <section className="portal-section" aria-labelledby="members-title">
            <header className="portal-section__header"><div><p className="portal-eyebrow">Danh tính đã gắn</p><h2 id="members-title">Thành viên</h2></div><Users aria-hidden="true" /></header>
            {memberData.length === 0 ? <PortalEmptyState title="Chưa có thành viên" description="Chưa có danh tính nào trong tenant scope hiện tại." /> : (
              <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Thành viên</th><th>Tenant</th><th>Role</th><th>Trạng thái</th><th>Đăng nhập cuối</th>{canWrite && <th>Thao tác</th>}</tr></thead><tbody>{memberData.map((member) => <MemberRow canWrite={canWrite} key={member.id} member={member} onUpdated={(value) => { setMessage(value); reload(); }} session={session} />)}</tbody></table></div>
            )}
          </section>
          <section className="portal-section" aria-labelledby="invitations-title">
            <header className="portal-section__header"><div><p className="portal-eyebrow">Chờ đăng nhập Google</p><h2 id="invitations-title">Lời mời</h2></div><UserCog aria-hidden="true" /></header>
            {invitationData.length === 0 ? <PortalEmptyState title="Không có lời mời" description="Không có lời mời đang chờ hoặc đã xử lý trong phạm vi hiện tại." /> : (
              <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Email</th><th>Tenant</th><th>Role</th><th>Trạng thái</th><th>Hết hạn</th></tr></thead><tbody>{invitationData.map((invite) => <tr key={invite.id}><th data-label="Email" scope="row"><strong>{String(invite.email)}</strong><small>{invite.id}</small></th><td data-label="Tenant">{invite.tenantName ? String(invite.tenantName) : String(invite.tenantId)}</td><td data-label="Role">{String(invite.role)}</td><td data-label="Trạng thái"><PortalStatus value={invite.status} /></td><td data-label="Hết hạn">{formatTime(invite.expiresAt)}</td></tr>)}</tbody></table></div>
            )}
          </section>
        </>
      )}
      <footer className="portal-status-line"><ShieldCheck aria-hidden="true" />Backend là nguồn quyết định quyền; việc ẩn nút trên UI không thay thế kiểm tra RBAC.</footer>
    </div></main>
  );
}
