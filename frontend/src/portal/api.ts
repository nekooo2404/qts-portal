import type {
  CollectionResponse,
  ContactRequestRecord,
  PortalOverview,
  PortalRecord,
  PortalResource,
} from './types';

interface ProblemEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
}

interface RequestOptions {
  body?: Record<string, unknown>;
  csrfToken?: string;
  idempotencyKey?: string;
  method?: 'GET' | 'POST' | 'PATCH';
  signal?: AbortSignal;
}

export class PortalApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new PortalApiError(
      response.status,
      'INVALID_API_RESPONSE',
      'Backend trả về dữ liệu không đúng định dạng JSON.',
    );
  }
  return response.json();
}

function problemFrom(value: unknown, status: number): PortalApiError {
  const problem = isRecord(value) ? (value as ProblemEnvelope).error : undefined;
  const code = typeof problem?.code === 'string' ? problem.code : 'PORTAL_REQUEST_FAILED';
  const message = typeof problem?.message === 'string'
    ? problem.message
    : 'Không thể hoàn tất yêu cầu tới QTS Portal.';
  return new PortalApiError(status, code, message, problem?.details);
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (options.csrfToken) headers['X-CSRF-Token'] = options.csrfToken;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  const response = await fetch(path, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin',
    headers,
    method: options.method ?? 'GET',
    signal: options.signal,
  });
  const payload = await readPayload(response);
  if (!response.ok) throw problemFrom(payload, response.status);
  return payload as T;
}

function unwrapRecord(value: unknown): PortalRecord {
  if (!isRecord(value) || !isRecord(value.data) || typeof value.data.id !== 'string') {
    throw new PortalApiError(502, 'INVALID_API_RESPONSE', 'Backend trả về bản ghi không hợp lệ.');
  }
  return value.data as PortalRecord;
}

function parseCollection(value: unknown): CollectionResponse {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.pagination)) {
    throw new PortalApiError(502, 'INVALID_API_RESPONSE', 'Backend trả về danh sách không hợp lệ.');
  }
  const records = value.data.filter(
    (item): item is PortalRecord => isRecord(item) && typeof item.id === 'string',
  );
  if (records.length !== value.data.length) {
    throw new PortalApiError(502, 'INVALID_API_RESPONSE', 'Danh sách chứa bản ghi không hợp lệ.');
  }
  const { page, pageSize, totalItems, totalPages } = value.pagination;
  if (![page, pageSize, totalItems, totalPages].every(Number.isInteger)) {
    throw new PortalApiError(502, 'INVALID_API_RESPONSE', 'Thông tin phân trang không hợp lệ.');
  }
  return {
    data: records,
    pagination: {
      page: Number(page),
      pageSize: Number(pageSize),
      totalItems: Number(totalItems),
      totalPages: Number(totalPages),
    },
  };
}

function withQuery(path: string, values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}

export async function getOverview(
  tenantId?: string,
  signal?: AbortSignal,
): Promise<PortalOverview> {
  const payload = await requestJson<unknown>(
    withQuery('/api/v1/portal/overview', { tenantId }),
    { signal },
  );
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.metrics)) {
    throw new PortalApiError(502, 'INVALID_API_RESPONSE', 'Dashboard trả về dữ liệu không hợp lệ.');
  }
  const overview = payload.data as unknown as PortalOverview;
  if (Array.isArray(payload.data.contactRequests)) {
    overview.contactRequests = payload.data.contactRequests as ContactRequestRecord[];
  }
  return overview;
}

export async function listResource(
  resource: PortalResource,
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    tenantId?: string;
    signal?: AbortSignal;
  } = {},
): Promise<CollectionResponse> {
  const payload = await requestJson<unknown>(
    withQuery(`/api/v1/portal/${resource}`, {
      page: options.page,
      pageSize: options.pageSize,
      search: options.search,
      tenantId: options.tenantId,
    }),
    { signal: options.signal },
  );
  return parseCollection(payload);
}

export async function createResource(
  resource: PortalResource,
  body: Record<string, unknown>,
  csrfToken: string,
  idempotencyKey?: string,
): Promise<PortalRecord> {
  return unwrapRecord(await requestJson<unknown>(`/api/v1/portal/${resource}`, {
    body,
    csrfToken,
    idempotencyKey,
    method: 'POST',
  }));
}

export async function updateResource(
  resource: PortalResource,
  id: string,
  body: Record<string, unknown>,
  csrfToken: string,
): Promise<PortalRecord> {
  return unwrapRecord(await requestJson<unknown>(`/api/v1/portal/${resource}/${id}`, {
    body,
    csrfToken,
    method: 'PATCH',
  }));
}

export async function listTicketComments(id: string): Promise<PortalRecord[]> {
  const payload = await requestJson<unknown>(`/api/v1/portal/tickets/${id}/comments`);
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new PortalApiError(502, 'INVALID_API_RESPONSE', 'Phản hồi ticket không hợp lệ.');
  }
  return payload.data as PortalRecord[];
}

export async function createTicketComment(
  id: string,
  body: Record<string, unknown>,
  csrfToken: string,
): Promise<PortalRecord> {
  return unwrapRecord(await requestJson<unknown>(`/api/v1/portal/tickets/${id}/comments`, {
    body,
    csrfToken,
    method: 'POST',
  }));
}

export async function listSpecialResource(
  resource: 'members' | 'invitations' | 'audit',
  options: { search?: string; tenantId?: string; signal?: AbortSignal } = {},
): Promise<CollectionResponse> {
  const payload = await requestJson<unknown>(
    withQuery(`/api/v1/portal/${resource}`, {
      pageSize: 100,
      search: options.search,
      tenantId: options.tenantId,
    }),
    { signal: options.signal },
  );
  return parseCollection(payload);
}

export async function createInvitation(
  body: Record<string, unknown>,
  csrfToken: string,
): Promise<PortalRecord> {
  return unwrapRecord(await requestJson<unknown>('/api/v1/portal/invitations', {
    body,
    csrfToken,
    method: 'POST',
  }));
}

export async function revokeInvitation(
  id: string,
  expectedVersion: number,
  csrfToken: string,
): Promise<PortalRecord> {
  return unwrapRecord(await requestJson<unknown>(`/api/v1/portal/invitations/${id}`, {
    body: { status: 'REVOKED', expectedVersion },
    csrfToken,
    method: 'PATCH',
  }));
}

export async function updateMember(
  id: string,
  body: Record<string, unknown>,
  csrfToken: string,
): Promise<PortalRecord> {
  return unwrapRecord(await requestJson<unknown>(`/api/v1/portal/members/${id}`, {
    body,
    csrfToken,
    method: 'PATCH',
  }));
}

export async function downloadDocument(id: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`/api/v1/portal/documents/${id}/download`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/pdf, text/plain, text/markdown' },
  });
  if (!response.ok) {
    const payload = await readPayload(response);
    throw problemFrom(payload, response.status);
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'qts-document';
  return { blob: await response.blob(), filename };
}
