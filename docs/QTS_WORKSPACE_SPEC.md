# Đặc tả QTS Operations Workspace

## 1. Mục tiêu

QTS Operations Portal cung cấp một nền tảng chung cho hai nhóm người dùng:

- Khách hàng quản lý dịch vụ công nghệ/an ninh trong đúng tenant của họ.
- Nhân viên QTS vận hành SOC, hỗ trợ và quản trị nhiều tenant theo role.

Hệ thống phải ưu tiên tính đúng của dữ liệu, cô lập tenant, khả năng điều tra và tốc độ truy cập thông tin. Không được dùng dữ liệu giả để che việc API rỗng hoặc lỗi.

## 2. Phạm vi hiện tại

Đã có website công ty, Google OIDC, PostgreSQL persistence, Client Portal, Internal Portal và API cho:

- Dashboard/security overview.
- Tenant/customer và SLA policy.
- Alert, ticket/comment, asset, license.
- Contract, invoice, document, knowledge article.
- Integration inventory và SOC shift.
- Membership, invitation và audit.

Chưa thuộc phạm vi hiện tại:

- SIEM/EDR ingestion worker và service-to-service credential.
- Payment gateway/ERP synchronization.
- Email delivery service cho lời mời.
- SAML provider.
- Object storage, malware scanning và WORM audit archive.

## 3. Bất biến hệ thống

1. Browser không nhận Google Client Secret, authorization code sau callback, ID token hoặc access token.
2. Định danh ổn định là `issuer + subject`; email không phải user ID.
3. Tenant và role lấy từ membership gắn với session, không tin dữ liệu do browser tự khai báo.
4. Client session chỉ truy cập tenant của chính nó.
5. Internal cross-tenant access vẫn phải qua permission backend.
6. Mutation cần CSRF; ticket create cần idempotency key.
7. Update cạnh tranh cần optimistic version.
8. Audit event không được update/delete qua application database.
9. Integration secret không được trả lại plaintext.
10. UI không tạo record/số liệu thay thế khi backend rỗng hoặc lỗi.

## 4. Kiến trúc và ranh giới

```text
React/Vite UI
  -> same-origin Node.js API
       -> policy + schema + service
            -> PostgreSQL repository
                 -> tenant RLS + append-only audit
```

- Frontend route guard chỉ quyết định trải nghiệm hiển thị.
- `portal-policy.js` ánh xạ role sang permission và resolve tenant scope.
- `portal-service.js` kiểm tra permission trước khi parse/thực thi use case.
- `portal-schema.js` từ chối unknown field, validate enum/length/time/URL.
- `portal-repository.js` thực hiện SQL trong transaction đã cài tenant context.
- PostgreSQL RLS là lớp phòng thủ bổ sung, không thay thế policy ở service.

## 5. IAM

### Google OIDC

- Authorization Code Flow, scope `openid email profile`.
- `state` chống login CSRF.
- `nonce` ràng buộc ID token.
- PKCE `S256` ràng buộc authorization code.
- Callback backend: `/api/v1/auth/callback/google`.
- Xác minh signature/JWKS, issuer, audience, expiry, nonce và `email_verified`.
- Khi cấu hình Google Workspace domain, claim `hd` phải khớp chính xác.

### Session

- Session ID ngẫu nhiên/opaque, chỉ bản băm được lưu PostgreSQL.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` và prefix `__Host-` ở production.
- Session có TTL tối đa theo cấu hình và bị thu hồi khi member đổi role/status.
- CSRF token gắn với session và được so sánh constant-time.
- OIDC transaction là one-time record có TTL trong PostgreSQL.

### Provisioning

- Tài khoản đầu tiên bootstrap từ `QTS_AUTH_MEMBERSHIPS_JSON` theo `iss + sub`.
- Tài khoản tiếp theo được pre-provision bằng invitation theo verified email.
- Lần login đầu tiên nhận invitation và bind sang `iss + sub`.
- Invitation quá hạn hoặc member disabled không tạo session.

## 6. Role và permission

Client roles: `client_viewer`, `technical`, `billing`, `client_admin`.

Internal roles: `soc_l1`, `soc_l2`, `soc_l3`, `account_manager`, `qts_admin`.

Permission được chia theo domain: dashboard, tenants, alerts, tickets, assets, billing, documents, knowledge, integrations, members, shifts và audit. Matrix thực thi nằm tại `backend/src/portal-policy.js`; frontend dùng matrix tương ứng để ẩn thao tác không khả dụng nhưng backend luôn là authoritative source.

## 7. Contract dữ liệu

### Danh sách

- Envelope: `data[]` và `pagination`.
- `page >= 1`, `pageSize <= 100`.
- `search <= 200` ký tự.
- Chỉ chấp nhận sort/filter đã khai báo theo resource.
- Client không thể override `tenantId` trong session.

### Mutation

- JSON field ngoài allowlist bị từ chối `422`.
- Resource ID nghiệp vụ là UUID; tenant ID có pattern riêng tối đa 64 ký tự.
- Update cần `expectedVersion`; mismatch trả `409`.
- Ticket create cần `Idempotency-Key`; dùng lại key với payload khác trả conflict.
- Mutation thành công ghi audit cùng transaction dữ liệu khi phù hợp.

### Tài liệu

- UI giới hạn 10 MiB; request JSON document giới hạn 14 MiB do Base64 overhead.
- Chấp nhận PDF, text/plain và Markdown.
- Backend kiểm tra payload/media type cơ bản và lưu SHA-256.
- Download kiểm tra permission/tenant và ghi audit.

### Secret tích hợp

- Endpoint bắt buộc HTTPS và không chứa username/password.
- Secret tối thiểu 16 ký tự.
- Mã hóa AES-256-GCM với nonce riêng, auth tag và additional authenticated data.
- API response chỉ cho biết tình trạng có secret, không trả ciphertext/plaintext.

## 8. UX

- Client và Internal dùng một hệ thống đăng nhập, chuyển workspace theo role.
- Internal có tenant selector; không chọn tenant tương đương view toàn cảnh cho thao tác đọc, nhưng mutation cần tenant cụ thể.
- Dashboard tự làm mới 30 giây và luôn cho biết phạm vi/thời điểm tạo dữ liệu.
- Mỗi page có loading, empty, error, denied và retry rõ ràng.
- Mobile 320 px không có horizontal overflow; menu chuyển thành drawer.
- Các thao tác icon có accessible name/tooltip; bàn phím có skip link và focus state.
- Không mô tả số `0` là dữ liệu mẫu; đó là kết quả query thực.

## 9. Threat model tóm tắt

| Tài sản | Rủi ro | Kiểm soát hiện tại | Việc production còn cần |
| --- | --- | --- | --- |
| Google login | CSRF/replay/token theft | state, nonce, PKCE, backend callback, HttpOnly cookie | Workspace MFA policy, IdP monitoring |
| Session | Theft/fixation | random opaque ID, hash at rest, expiry, Secure/SameSite | Central revocation operations, anomaly detection |
| Dữ liệu tenant | Cross-tenant disclosure | backend scope + PostgreSQL RLS + tests | Independent security review/pentest |
| Ticket/incident | Tampering/duplicate | validation, optimistic version, idempotency, audit | Dual control cho thao tác rủi ro cao |
| Integration secret | Disclosure | AES-256-GCM, response redaction | KMS rotation job và vault integration |
| Tài liệu | Malware/disclosure | type/size check, checksum, auth download | AV/CDR, object storage, DLP, retention |
| Audit | Repudiation | append-only trigger, actor/request metadata | WORM export, SIEM correlation, retention |

## 10. Yêu cầu phi chức năng

- Backend fail startup nếu cấu hình auth/database/encryption không hợp lệ.
- Production chỉ dùng HTTPS và PostgreSQL TLS.
- Production tách owner chạy migration khỏi role runtime `qts_app` không có `SUPERUSER`/`BYPASSRLS`; startup phải fail-fast nếu cấu hình sai.
- Health tách liveness (`/health`) và readiness có database (`/ready`).
- Backend có request/header/keep-alive timeout, max header count và graceful shutdown.
- Frontend production không ship sourcemap.
- Không có secret, tài khoản hoặc operational seed trong Git.
- Quality gate tối thiểu: typecheck, lint, unit test, database integration, build, dependency audit và browser smoke test.

## 11. Tiêu chí nghiệm thu ứng dụng

- Google login thật tạo session QTS và redirect đúng workspace.
- Role sai không mở route và API trả forbidden.
- Client không đọc/ghi tenant khác ngay cả khi sửa request thủ công.
- Internal tenant selector thay đổi đúng scope truy vấn.
- CRUD/flow chính của từng module lưu và đọc lại từ PostgreSQL.
- Ticket idempotency, version conflict và comment visibility hoạt động.
- Member role/status change thu hồi session.
- Audit ghi đúng actor/action/resource/outcome.
- Database rỗng cho empty state, không sinh dữ liệu giả.
- UI không overflow ở mobile và không có console error trong smoke flow.

Các tiêu chí production như HA, WAF, ingestion, backup restore drill, load test, DAST và pentest nằm trong [QTS_WORKSPACE_PLAN.md](QTS_WORKSPACE_PLAN.md).
