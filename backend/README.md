# QTS Portal Backend

Backend Node.js là ranh giới bảo mật và nguồn quyết định quyền của QTS Portal. Service xử lý Google OIDC, session/CSRF, tenant RBAC, validation, persistence PostgreSQL và audit cho cả Client Portal lẫn Internal Portal.

Hướng dẫn setup và runbook đầy đủ nằm tại [README gốc](../README.md).

## Trách nhiệm

- Google Authorization Code Flow với `openid email profile`, `state`, `nonce` và PKCE S256.
- Xác minh chữ ký ID token/JWKS, `iss`, `aud`, `exp`, `nonce`, `email_verified` và `hd` khi cấu hình.
- Định danh người dùng bằng `iss + sub`; email chỉ dùng để khớp lời mời lần đầu.
- Opaque session và OIDC transaction được băm/lưu trong PostgreSQL.
- Session cookie HttpOnly, Secure ở production, SameSite=Lax; mutation cần CSRF token.
- Deny-by-default RBAC và tenant scope lấy từ session.
- PostgreSQL Row-Level Security cho dữ liệu tenant.
- Validation allowlist, body-size limit, pagination, idempotency và optimistic concurrency.
- Audit append-only cho auth, mutation đặc quyền và download tài liệu.
- Mã hóa secret tích hợp bằng AES-256-GCM.

## Cấu trúc

```text
backend/
|-- .env.example
|-- migrations/                  # SQL up/down
|-- integration/                 # PostgreSQL integration tests
|-- scripts/
|   |-- check-js.js
|   `-- database.js
|-- src/
|   |-- app.js                   # HTTP router, cookie, CSRF, limits
|   |-- auth-config.js           # Env/OIDC/role validation
|   |-- auth-service.js          # Login, claims, session, logout
|   |-- auth-store.js            # PostgreSQL expiring record store
|   |-- google-oidc.js           # openid-client adapter
|   |-- database.js              # Pool và scoped transaction
|   |-- membership-repository.js # Bootstrap/invitation identity
|   |-- portal-policy.js         # Permission và tenant scope
|   |-- portal-schema.js         # Input/query contracts
|   |-- portal-service.js        # Use-case authorization
|   |-- portal-repository.js     # SQL, audit, RLS scope
|   |-- secret-crypto.js         # AES-256-GCM
|   `-- server.js                # Wiring, migration, lifecycle
`-- test/                        # Unit và HTTP tests
```

## Chạy backend

Từ thư mục gốc repository:

```powershell
docker compose --env-file backend/.env up -d database
npm run db:migrate:env --workspace @qts/backend
npm run dev:backend:env
```

Backend mặc định lắng nghe `http://127.0.0.1:8080`. `server.js` tự áp dụng migration chưa chạy trước khi nhận traffic.

Chế độ không watch:

```powershell
npm run start:backend:env
```

Không đọc file `.env`, phù hợp khi deployment platform inject process environment:

```powershell
npm run start:backend
```

## Database

Migration hiện có:

| Migration | Nội dung |
| --- | --- |
| `001_core` | Tenant, membership, auth record, asset, license, alert, ticket/comment, contract, invoice, document, knowledge, integration, shift, audit và RLS |
| `002_sla_and_knowledge_policy` | SLA theo severity và audience policy cho knowledge |
| `003_membership_management` | UUID/version phục vụ cập nhật thành viên |
| `004_internal_invitations` | Lời mời role client/internal với constraint role-workspace |
| `005_runtime_database_role` | Role runtime `qts_app` không đặc quyền và quyền DML tối thiểu cho RLS |

Mọi repository operation chạy trong transaction, hạ quyền bằng `SET LOCAL ROLE qts_app`, rồi đặt `qts.tenant_id` và `qts.internal_access`. Client scope không thể yêu cầu tenant khác; internal scope chỉ cross-tenant sau khi backend permission cho phép. Integration test còn truy cập các UUID đã biết của tenant khác để xác minh API vẫn trả `404` thay vì dựa vào việc ID khó đoán.

Local dùng owner `qts` từ Compose và hạ quyền trong transaction. Production bắt buộc tách hai connection:

- `QTS_DATABASE_URL`: role đăng nhập `qts_app`, không `SUPERUSER`, không `BYPASSRLS`, chỉ dùng cho runtime.
- `QTS_MIGRATION_DATABASE_URL`: owner/DDL credential, chỉ dùng lúc startup/release migration.

Migration tạo `qts_app` ở trạng thái `NOLOGIN`; DBA phải cấp `LOGIN` và password runtime bằng công cụ quản trị/secret manager. Backend production kiểm tra role thực tế và dừng ngay nếu cấu hình URL runtime đặc quyền hoặc thiếu URL migration.

Lùi đúng một migration:

```powershell
npm run db:rollback:env --workspace @qts/backend
```

Chỉ rollback sau khi backup và đọc file `.down.sql`; một số migration từ chối rollback nếu dữ liệu hiện tại không tương thích.

## Endpoint

### Infrastructure và auth

| Method | Path |
| --- | --- |
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/auth/status` |
| `GET` | `/api/v1/auth/login/google` |
| `GET` | `/api/v1/auth/callback/google` |
| `GET` | `/api/v1/auth/session` |
| `POST` | `/api/v1/auth/logout` |

### Portal

| Pattern | Resource/hành vi |
| --- | --- |
| `GET /api/v1/portal/overview` | Dashboard tổng hợp |
| `GET,POST /api/v1/portal/{resource}` | alerts, tickets, assets, licenses, tenants, contracts, invoices, documents, knowledge, integrations, shifts |
| `PATCH /api/v1/portal/{resource}/{id}` | Cập nhật resource, trừ documents |
| `GET,POST /api/v1/portal/tickets/{id}/comments` | Ticket conversation |
| `GET /api/v1/portal/documents/{id}/download` | Authorized download |
| `GET,PATCH /api/v1/portal/members[/{id}]` | Membership management |
| `GET,POST /api/v1/portal/invitations` | Invitation provisioning |
| `GET /api/v1/portal/audit` | Audit search |

Contract đầy đủ: [OpenAPI](../docs/api/openapi.yaml).

## Quy ước request

- Portal endpoint cần session cookie cùng origin.
- `POST`/`PATCH` cần `X-CSRF-Token` khớp session.
- Tạo ticket cần `Idempotency-Key` dài 8–128 ký tự thuộc `[A-Za-z0-9._:-]`.
- List hỗ trợ `page`, `pageSize <= 100`, `search`, sort, filter và `tenantId` theo quyền.
- Mutation update cần `expectedVersion`; version cũ trả `409`.
- JSON thường tối đa 1 MiB; document JSON tối đa 14 MiB để mang file Base64 tối đa 10 MiB.
- Response có `X-Request-Id`; auth/portal response nhạy cảm dùng `Cache-Control: no-store`.

Error envelope:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Tài khoản không có quyền thực hiện thao tác này."
  }
}
```

## Bảo mật dữ liệu

- Google Client Secret không bao giờ được trả cho frontend.
- Google token được loại bỏ sau khi lấy claims; session không lưu ID/access token.
- Cookie production là `__Host-qts_session`; transaction cookie là `__Secure-qts_oidc_tx`.
- Integration secret mã hóa trước khi ghi DB và không xuất hiện trong list/detail response.
- Document download kiểm tra permission/tenant và ghi audit.
- Audit table có trigger chặn update/delete.
- Production yêu cầu `QTS_DATABASE_SSL=true`, HTTPS public origin, secure cookie, runtime role `qts_app` và migration credential riêng.

## Kiểm thử

```powershell
npm run test:backend
npm run test:integration:env --workspace @qts/backend
npm run lint:backend
npm run build:backend
```

Integration tests xác minh migration, RLS chéo tenant, ticket idempotency và audit append-only trên PostgreSQL thực.

## Giới hạn cần lưu ý

- Chưa có service credential/worker ingestion cho SIEM/EDR.
- Chưa có job xoay lại toàn bộ integration secret khi đổi encryption key.
- Document chưa qua antivirus/CDR và hiện lưu trong PostgreSQL.
- Audit cùng database chưa thay thế WORM archive độc lập.
- Rate limiter login trong process chỉ là lớp phụ; production vẫn cần WAF/gateway rate limit.
