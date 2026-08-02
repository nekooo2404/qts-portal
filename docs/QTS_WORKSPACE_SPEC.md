# Đặc tả QTS Workspace

## Trạng thái

Được cập nhật ngày 03/08/2026 sau khi bổ sung Google OpenID Connect và session phía backend. Tài liệu mô tả trạng thái repository hiện tại cùng các điều kiện còn thiếu trước khi phát triển portal nghiệp vụ.

## 1. Mục tiêu hệ thống

QTS Portal hướng tới một nền tảng dùng chung IAM nhưng tách quyền rõ ràng cho hai phân hệ:

1. **Client Portal**: khách hàng theo dõi dịch vụ, cảnh báo, ticket/SLA, tài sản, giấy phép, hợp đồng, hóa đơn, tài liệu tuân thủ và audit thuộc tenant của mình.
2. **Internal Portal**: SOC, kỹ sư và account QTS giám sát đa tenant, điều phối sự cố, quản lý khách hàng, ca trực, tích hợp và audit liên quan đến phạm vi được cấp quyền.

Hai phân hệ nghiệp vụ chưa được kích hoạt. Repository cung cấp website công ty, Google OIDC, cổng RBAC, route bảo vệ và backend hạ tầng; chưa có dữ liệu/API SOC, ticket, asset hoặc billing.

## 2. Nguyên tắc dữ liệu

1. Không có record người dùng, tenant, cảnh báo, telemetry, ticket, sự cố, tài sản, license, billing, tài liệu hay audit event dựng sẵn trong runtime.
2. Không có credential, OTP, Google token, API key, phiên đăng nhập hoặc persona dựng sẵn trong frontend.
3. Frontend không sinh số liệu thay thế khi API thiếu, lỗi hoặc trả rỗng.
4. Trạng thái loading, empty, error và unavailable phải được thể hiện trung thực.
5. Nội dung giới thiệu công khai tại `/company` được xem là nội dung biên tập, không phải dữ liệu vận hành.
6. Dữ liệu nghiệp vụ chỉ được hiển thị sau khi đi qua IAM, authorization phía server và tenant isolation.

## 3. Phạm vi đã triển khai

### 3.1. Frontend

- React/Vite/TypeScript tách riêng trong `frontend/`.
- Website công ty QTS tại `/company`.
- Cổng truy cập tại `/` đọc trạng thái OIDC/session từ backend và không nhận credential.
- `/client/*` yêu cầu session có workspace `client`.
- `/admin/*` yêu cầu session có workspace `internal`.
- Route không hợp lệ hiển thị 404.
- Thiết kế responsive, keyboard focus, reduced motion và static security headers.
- Unit/component test xác nhận không có form credential, không mở sai workspace và không có bảng dữ liệu dựng sẵn.

### 3.2. Backend

- Node.js HTTP service tách riêng trong `backend/`.
- `GET /api/v1/health` cho liveness.
- `GET /api/v1/ready` cho readiness.
- Google OIDC login/callback, auth status, session và logout.
- Membership theo `iss + sub`, tenant, role và workspace.
- Opaque session cookie, CSRF logout và auth event trên stdout.
- JSON error envelope, security headers, giới hạn header, timeout và graceful shutdown.
- OpenAPI 3.1 tại `docs/api/openapi.yaml`.
- Integration test qua HTTP server thật.

## 4. Ngoài phạm vi hiện tại

- Shared session store, session management UI, revoke từng phiên và recovery.
- Bằng chứng MFA theo từng phiên; hiện MFA phải được cưỡng chế bởi Google Workspace policy.
- API nghiệp vụ và database.
- Dashboard realtime, SSE/WebSocket hoặc nguồn telemetry.
- Ticket, incident dispatch, CRM, asset, license, billing, report và audit nghiệp vụ.
- Điều khiển firewall, EDR, SIEM, SOAR hoặc thiết bị.
- Thanh toán, file upload/download và quản lý secret tích hợp.
- Cam kết production về SLA, uptime hoặc số lượng tấn công.

Các chức năng trên không được thay bằng logic hoặc dữ liệu cục bộ để tạo cảm giác đã hoạt động.

## 5. Route và hành vi hiện tại

| Route | Quyền truy cập hiện tại | Hành vi |
| --- | --- | --- |
| `/` | Công khai | Hiển thị trạng thái Google OIDC/session; không có form credential |
| `/company` | Công khai | Hiển thị website công ty QTS |
| `/client` và `/client/*` | Session workspace `client` | Anonymous yêu cầu login; sai workspace bị từ chối; không có dữ liệu giả |
| `/admin` và `/admin/*` | Session workspace `internal` | Anonymous yêu cầu login; sai workspace bị từ chối; không có dữ liệu giả |
| Route khác | Công khai | Hiển thị 404 |

Guard frontend chỉ điều chỉnh UX, không phải authorization. Mọi API nghiệp vụ tương lai phải tự kiểm tra session, tenant và permission kể cả khi người dùng tự nhập URL.

## 6. Mô hình quyền mục tiêu

### 6.1. Vai trò khách hàng

| Vai trò | Phạm vi dự kiến |
| --- | --- |
| `client_admin` | Quản trị người dùng tenant, xem toàn bộ dịch vụ được cấp |
| `technical` | Cảnh báo, ticket, tài sản và tài liệu kỹ thuật |
| `billing` | Hợp đồng, hóa đơn và license liên quan |
| `client_viewer` | Chỉ đọc các tài nguyên được cấp |

### 6.2. Vai trò nội bộ QTS

| Vai trò | Phạm vi dự kiến |
| --- | --- |
| `qts_admin` | Quản trị nền tảng theo chính sách đặc quyền |
| `soc_l1` | Tiếp nhận, xác nhận và xử lý mức L1 |
| `soc_l2` | Điều tra, xử lý và phân công L1/L2 |
| `soc_l3` | Điều tra chuyên sâu và thay đổi đã được phê duyệt |
| `account_manager` | Hồ sơ khách hàng, hợp đồng và theo dõi dịch vụ |

Các role này đang dùng để chọn workspace trong session nhưng chưa cấp quyền trên dữ liệu nghiệp vụ. Role matrix chi tiết vẫn phải được QTS duyệt và thực thi ở API cùng tầng truy vấn dữ liệu.

## 7. Hợp đồng IAM bắt buộc

Nền tảng IAM hiện đã quyết định:

1. Google OIDC Authorization Code Flow với `state`, `nonce` và PKCE S256.
2. Định danh bằng `iss + sub`; kiểm tra `email_verified` và `hd` tùy cấu hình.
3. Session opaque qua cookie `HttpOnly`, `Secure`, `SameSite=Lax` ở production.
4. Tenant, role và workspace lấy từ membership backend.
5. Logout dùng CSRF token và thu hồi session server-side.

Trước production vẫn phải hoàn tất shared store, revoke theo phiên, account disable, emergency access, durable audit, cảnh báo bất thường và kiểm chứng chính sách MFA của Google Workspace.

## 8. Hợp đồng dữ liệu bắt buộc

Mỗi domain chỉ được bật sau khi có:

- OpenAPI được version hóa và review.
- Schema database cùng migration/rollback.
- Quy tắc tenant ownership và authorization.
- Validation request/response ở biên API.
- Pagination, filter, sort và giới hạn kích thước.
- Loading, empty, error, unavailable và permission-denied state ở frontend.
- Audit cho thao tác nhạy cảm; không log secret hoặc nội dung nhạy cảm không cần thiết.
- Unit, integration và browser test, gồm kiểm thử truy cập chéo tenant.
- Observability: structured log, metric, trace/correlation ID và alert phù hợp.

## 9. Tech stack hiện tại

| Lớp | Công nghệ |
| --- | --- |
| Frontend | React 19, React DOM 19, TypeScript strict |
| Build | Vite 7, target ES2022 |
| Routing | History API nội bộ với tập route đóng |
| Icon | Lucide React |
| Style | CSS thuần và design token ba tầng |
| Frontend test | Vitest, Testing Library, user-event, JSDOM |
| Browser QA | Playwright |
| Backend | Node.js HTTP API, `openid-client` cho OIDC |
| API contract | OpenAPI 3.1 |
| Backend test | Node.js test runner qua HTTP server thật |
| Repository | npm workspaces, một lockfile ở root |

Không có thư viện biểu đồ trong baseline vì chưa có nguồn metric thật.

## 10. Ranh giới tin cậy và threat model

| Tài sản/biên | Nguy cơ chính | Kiểm soát hiện tại | Bắt buộc trước production |
| --- | --- | --- | --- |
| Cổng truy cập | Spoofing, replay, credential disclosure | Google OIDC, state, nonce, PKCE, cookie HttpOnly, rate limit | MFA policy, shared store, recovery an toàn |
| Route client/admin | Elevation of privilege | Không render nghiệp vụ | Authorization server-side trên mọi endpoint |
| Dữ liệu tenant | Cross-tenant disclosure | Chưa lưu/hiển thị | Tenant từ session, policy tầng truy vấn, test cô lập |
| Ticket/sự cố | Tampering, repudiation | Chưa triển khai | Validation server, idempotency, audit append-only |
| Report/hóa đơn | Information disclosure | Chưa triển khai | Access check, signed URL ngắn hạn, malware scan |
| Integration secret | Disclosure, tampering | Không lưu secret | Vault/KMS, rotation, dual control |
| Backend HTTP | DoS, disclosure | Timeout, header limit, lỗi không lộ stack | WAF, rate limit, authn/authz, capacity test |

## 11. Kiến trúc production mục tiêu

1. Một backend dùng chung domain nhưng tách module và policy cho Client/Internal Portal.
2. PostgreSQL cho tenant, user mapping, permission, ticket, asset, contract, invoice và audit metadata.
3. OpenSearch/Elasticsearch chỉ khi volume và truy vấn telemetry chứng minh nhu cầu; index phải cô lập tenant.
4. Object storage mã hóa cho report, bằng signed URL ngắn hạn.
5. Secret manager và KMS/HSM cho secret, key và dữ liệu nhạy cảm at-rest.
6. SSE/WebSocket chỉ sau khi có authenticated connection, tenant authorization, backpressure và rate limit.
7. TLS 1.2+, WAF/DDoS protection, network segmentation và backup/restore đã diễn tập.
8. CI/CD có secret scan, SAST, SCA, IaC scan, DAST staging và pentest trước go-live.

## 12. Tiêu chí chấp nhận baseline hiện tại

1. Không còn module dữ liệu vận hành hoặc state mutation cục bộ.
2. Không có form credential, mã MFA, SSO thay thế, persona, Google token hoặc session dựng sẵn trong frontend.
3. `/client/*` và `/admin/*` không render bảng, biểu đồ hoặc số liệu nghiệp vụ.
4. `/company` tiếp tục hoạt động và dùng logo QTS.
5. Backend chỉ công bố endpoint hạ tầng và auth có trong OpenAPI.
6. Test, typecheck, lint, build và dependency audit đạt.
7. Browser console sạch, không overflow hoặc chồng lấp ở desktop/mobile.
8. README và runbook phản ánh đúng trạng thái OIDC, session in-memory và điều kiện production.

## 13. Quyết định QTS cần phê duyệt

- Chính sách MFA Google Workspace, shared session store, recovery và emergency access.
- Tenant model, role matrix và quy trình phê duyệt đặc quyền.
- Backend runtime dài hạn và dữ liệu của từng domain.
- Cloud/region, retention, RTO/RPO, backup và key management.
- Nguồn telemetry, taxonomy severity, SLA và escalation.
- Payment provider, thẩm quyền hóa đơn và quy trình đối soát.
- Danh sách SIEM/SOAR/EDR/webhook được phép tích hợp.
