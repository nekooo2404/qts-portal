# QTS Operations Portal

QTS Operations Portal là monorepo tách riêng frontend React/Vite và backend Node.js cho nền tảng công nghệ, an ninh mạng của QTS tại Việt Nam.

Hệ thống đã có Google OpenID Connect theo Authorization Code Flow, `state`, `nonce`, PKCE S256, ánh xạ tenant/role bằng `iss + sub`, session cookie phía backend và CSRF cho logout. Repository không chứa tài khoản, tenant hay dữ liệu vận hành dựng sẵn. Các API nghiệp vụ như SOC, ticket, asset và billing chưa được triển khai nên giao diện không tự tạo số liệu thay thế.

## 1. Trạng thái chức năng

| Hạng mục | Trạng thái | Hành vi hiện tại |
| --- | --- | --- |
| Website QTS | Hoạt động | `/company` hiển thị nội dung công nghệ và an ninh |
| Google OIDC | Hoạt động khi có biến môi trường | Callback và token exchange chỉ chạy ở backend |
| Session QTS | Hoạt động | Opaque session ID trong cookie HttpOnly; Google token không đi vào frontend |
| RBAC | Hoạt động ở cổng truy cập | Backend ánh xạ `iss + sub` sang tenant, role và workspace |
| Client Portal | Có cổng bảo vệ | Chỉ mở trạng thái đã xác thực; chưa có dữ liệu nghiệp vụ |
| Internal Portal | Có cổng bảo vệ | Chỉ mở trạng thái đã xác thực; chưa có dữ liệu SOC |
| API nghiệp vụ | Chưa triển khai | Không có ticket, incident, asset, billing, CRM hoặc telemetry |
| Database/search | Chưa triển khai | Session và giao dịch OIDC đang lưu trong RAM của một backend process |
| Audit bền vững | Chưa triển khai | Auth event được ghi JSON ra stdout; chưa có kho append-only |

## 2. Kiến trúc

```text
Browser
  -> frontend React/Vite
       -> /company
       -> /, /client/*, /admin/*
       -> /api/* (same-origin; Vite proxy ở development)
            -> backend Node.js
                 -> Google OIDC discovery/JWKS/token endpoint
                 -> transaction store trong RAM
                 -> session store trong RAM
                 -> membership allowlist từ biến môi trường
```

Frontend và backend có trách nhiệm khác nhau:

- Frontend chỉ render trạng thái loading, anonymous, authenticated, forbidden và unavailable.
- Frontend không nhận client secret, authorization code, ID token hoặc access token để lưu trữ.
- Backend tạo `state`, `nonce`, PKCE verifier/challenge, nhận callback và đổi authorization code.
- Backend dùng `openid-client` để xác minh chữ ký ID token và kiểm tra giao thức OIDC.
- Backend kiểm tra lại `iss`, `aud`, `exp`, `nonce`, `email_verified` và `hd` nếu được cấu hình.
- Backend lấy tenant/role từ allowlist đã quản trị; không tin `tenantId` hoặc `role` do browser gửi.

## 3. Công nghệ

| Lớp | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | React `19.2.8`, TypeScript `6.0.3` | Giao diện và route trạng thái |
| Build frontend | Vite `7.3.6` | Dev server, proxy và production bundle |
| UI | CSS custom properties, Lucide React | Design token và icon |
| Backend | Node.js HTTP, ESM | API, cookie, session và lifecycle |
| OIDC | `openid-client` `6.8.4` | Discovery, authorization URL, token exchange và ID token validation |
| Test frontend | Vitest, Testing Library, JSDOM | Component và luồng auth UI |
| Test backend | Node.js test runner | HTTP integration, config, OIDC adapter và session |
| API contract | OpenAPI `3.1.0` | Hợp đồng endpoint tại `docs/api/openapi.yaml` |
| Monorepo | npm workspaces | Một lockfile cho frontend và backend |

## 4. Yêu cầu môi trường

- Node.js thỏa `^20.19.0 || >=22.12.0`.
- npm tương thích với lockfile.
- Một Google Cloud project có OAuth consent configuration.
- HTTPS ở production.
- Google Workspace Admin Console nếu QTS muốn bắt buộc 2-Step Verification cho tài khoản nhân viên.

Kiểm tra và cài dependency:

```powershell
cd D:\hoapuiii\Code\qts-portal
node --version
npm --version
npm ci
```

## 5. Tạo OAuth Client trên Google Cloud

### 5.1. Cấu hình consent

1. Mở Google Cloud Console và chọn đúng project dùng cho QTS Portal.
2. Mở Google Auth Platform, hoàn tất Branding, Audience và Data Access.
3. Khai báo các scope `openid`, `email`, `profile`.
4. Nếu ứng dụng chỉ phục vụ Google Workspace của QTS, chọn audience nội bộ phù hợp với tổ chức. Việc này không thay thế kiểm tra claim `hd` tại backend.
5. Nếu ứng dụng ở chế độ testing, thêm đúng test users theo chính sách Google.

### 5.2. Tạo Web application client

1. Vào Google Auth Platform > Clients.
2. Chọn Create client > Web application.
3. Đặt tên nhận diện rõ môi trường, ví dụ client riêng cho development và production.
4. Khai báo Authorized JavaScript origins theo origin thực tế.
5. Khai báo Authorized redirect URIs khớp tuyệt đối với callback backend.

Development theo cấu hình mẫu:

```text
Authorized JavaScript origin: http://localhost:5173
Authorized redirect URI:      http://localhost:5173/api/v1/auth/callback/google
```

Production:

```text
Authorized JavaScript origin: https://portal.<ten-mien-qts>
Authorized redirect URI:      https://portal.<ten-mien-qts>/api/v1/auth/callback/google
```

6. Ghi nhận Client ID và Client Secret vào secret manager của backend.
7. Không đặt Client Secret trong `VITE_*`, source code, Docker image, log, ticket hoặc Git.

Redirect URI đi qua public origin rồi reverse proxy tới backend. Đây vẫn là callback backend vì frontend không xử lý authorization code.

## 6. Cấu hình backend

File [backend/.env.example](backend/.env.example) chỉ chứa tên biến và giá trị không nhạy cảm. Tạo `backend/.env` cho development; file này đã bị Git bỏ qua.

```powershell
Copy-Item backend\.env.example backend\.env
```

Điền các biến sau trong `backend/.env`:

| Biến | Bắt buộc | Quy tắc |
| --- | --- | --- |
| `NODE_ENV` | Có | `development` ở local, `production` khi deploy |
| `QTS_API_HOST` | Không | Mặc định `127.0.0.1` |
| `QTS_API_PORT` | Không | Mặc định `8080` |
| `QTS_TRUST_PROXY_HOPS` | Không | Mặc định `0`; chỉ tăng khi backend chỉ nhận traffic từ đúng số proxy tin cậy |
| `QTS_PUBLIC_ORIGIN` | Có khi bật OIDC | Chỉ scheme + host + port; không có path/query/hash |
| `QTS_AUTH_COOKIE_SECURE` | Có ở local HTTP | `false` chỉ cho local; production bắt buộc `true` |
| `GOOGLE_CLIENT_ID` | Có | Client ID của Web application |
| `GOOGLE_CLIENT_SECRET` | Có | Chỉ cấp cho backend qua secret manager hoặc env |
| `GOOGLE_WORKSPACE_DOMAIN` | Không | Domain `hd` phải khớp; để trống nếu không giới hạn Workspace |
| `QTS_AUTH_MEMBERSHIPS_JSON` | Có | Mảng JSON ánh xạ `issuer`, `subject`, `tenantId`, `role` |
| `QTS_AUTH_TRANSACTION_TTL_SECONDS` | Không | `120..900`, mặc định `600` |
| `QTS_SESSION_TTL_SECONDS` | Không | `900..86400`, mặc định `28800` |

OIDC chỉ được bật khi có đồng thời `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và `QTS_AUTH_MEMBERSHIPS_JSON`. Nếu cấu hình một phần, backend dừng ngay thay vì chạy nửa vời.

Khởi động backend có đọc `backend/.env`:

```powershell
npm run dev:backend:env
```

Khởi động frontend ở terminal khác:

```powershell
npm run dev:frontend
```

Mở `http://localhost:5173/`. Không trộn `localhost` và `127.0.0.1` trong quá trình OIDC vì cookie và redirect URI phụ thuộc origin chính xác.

## 7. Thêm tài khoản đăng nhập

### 7.1. Thu thập `iss + sub` cho tài khoản đầu tiên

1. Đặt `QTS_AUTH_MEMBERSHIPS_JSON=[]`.
2. Nếu chỉ nhận tài khoản QTS, đặt `GOOGLE_WORKSPACE_DOMAIN` đúng domain Google Workspace.
3. Khởi động backend và frontend.
4. Người cần cấp quyền chọn Đăng nhập với Google.
5. Callback sẽ bị từ chối với `MEMBERSHIP_NOT_FOUND`; không có session nào được tạo.
6. Trong stdout backend, lấy auth event `auth_membership_not_found` gồm `issuer`, `subject` và email đã xác minh.
7. Xác nhận người yêu cầu qua quy trình nội bộ QTS trước khi thêm membership.

Email trong event chỉ hỗ trợ đối chiếu vận hành. Khóa định danh được lưu và so khớp luôn là `issuer + subject`.

### 7.2. Khai báo membership

Mỗi phần tử trong `QTS_AUTH_MEMBERSHIPS_JSON` có đúng bốn trường:

```json
{
  "issuer": "https://accounts.google.com",
  "subject": "gia-tri-sub-da-xac-minh",
  "tenantId": "tenant-do-qts-quan-ly",
  "role": "client_admin"
}
```

Danh sách role được hỗ trợ:

| Role | Workspace | Phạm vi dự kiến |
| --- | --- | --- |
| `client_admin` | Client | Quản trị tài khoản khách hàng |
| `client_viewer` | Client | Chỉ xem dữ liệu được cấp |
| `billing` | Client | Hợp đồng, hóa đơn và subscription |
| `technical` | Client | Ticket, asset và cấu hình kỹ thuật |
| `soc_l1` | Internal | Phân tích và xử lý cấp 1 |
| `soc_l2` | Internal | Phân tích và xử lý cấp 2 |
| `soc_l3` | Internal | Điều tra và escalation cấp 3 |
| `account_manager` | Internal | Quản lý account khách hàng |
| `qts_admin` | Internal | Quản trị hệ thống QTS |

`tenantId` chỉ chấp nhận chữ, số, dấu chấm, gạch dưới và gạch ngang; tối đa 64 ký tự. Không được trùng cặp `issuer + subject`.

Sau khi cập nhật membership, khởi động lại backend. Người dùng đăng nhập lại để nhận session chứa tenant/role mới. Session đã phát trước đó không tự đổi quyền giữa vòng đời.

## 8. Luồng đăng nhập

1. Frontend gọi `GET /api/v1/auth/status`.
2. Người dùng mở `GET /api/v1/auth/login/google?returnTo=...`.
3. Backend sinh `state`, `nonce`, PKCE verifier và S256 challenge mới.
4. Backend lưu giao dịch một lần trong RAM và đặt cookie giao dịch `HttpOnly`, `SameSite=Lax`.
5. Browser được chuyển tới Google với `response_type=code` và scope `openid email profile`.
6. Google chuyển browser về `/api/v1/auth/callback/google`.
7. Backend so khớp state với cookie, tiêu thụ giao dịch một lần và đổi code bằng PKCE verifier.
8. `openid-client` xác minh chữ ký/JWKS, issuer, audience, thời hạn và nonce; backend kiểm tra lại các claim bắt buộc.
9. Backend kiểm tra `email_verified === true` và `hd` khi có `GOOGLE_WORKSPACE_DOMAIN`.
10. Backend tìm membership bằng `iss + sub`, tạo session ID opaque và CSRF token.
11. Browser chỉ nhận QTS session cookie. Google ID token/access token không được lưu trong session, localStorage hoặc sessionStorage.
12. Frontend gọi `GET /api/v1/auth/session` và chỉ hiển thị workspace được backend cấp.

## 9. Route và endpoint

### Frontend

| Route | Hành vi |
| --- | --- |
| `/` | Cổng trạng thái và đăng nhập Google |
| `/company` | Website công ty QTS |
| `/client/*` | Yêu cầu session có workspace `client` |
| `/admin/*` | Yêu cầu session có workspace `internal` |
| Route khác | `404` |

### Backend

| Method | Path | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Public | Liveness |
| `GET` | `/api/v1/ready` | Public | Readiness |
| `GET` | `/api/v1/auth/status` | Public | Trạng thái cấu hình OIDC, không lộ secret |
| `GET` | `/api/v1/auth/login/google` | Public, rate limited | Bắt đầu Authorization Code Flow |
| `GET` | `/api/v1/auth/callback/google` | OIDC transaction | Xác minh callback và tạo session |
| `GET` | `/api/v1/auth/session` | Session cookie | Trả user display, tenant, role, workspace và CSRF token |
| `POST` | `/api/v1/auth/logout` | Session + CSRF | Thu hồi session và xóa cookie |

Hợp đồng chi tiết: [docs/api/openapi.yaml](docs/api/openapi.yaml).

## 10. Các lệnh vận hành

| Lệnh | Mục đích |
| --- | --- |
| `npm ci` | Cài đúng lockfile |
| `npm run dev:frontend` | Chạy Vite có HMR |
| `npm run dev:backend` | Chạy backend không đọc `.env` |
| `npm run dev:backend:env` | Chạy backend và đọc `backend/.env` |
| `npm run start:backend` | Chạy backend production-style từ process env |
| `npm run start:backend:env` | Chạy backend và đọc `backend/.env` |
| `npm run test:frontend` | Test frontend |
| `npm run test:backend` | Test backend |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | Lint/syntax toàn repo |
| `npm run build` | Build frontend và kiểm tra backend |
| `npm run check` | Typecheck, lint, test và build |
| `npm audit --audit-level=moderate` | Kiểm tra dependency advisory |

## 11. Kiểm soát bảo mật

- Authorization Code Flow chạy tại backend; client secret không xuất hiện trong bundle.
- `state` chống login CSRF, `nonce` chống ID token replay, PKCE S256 ràng buộc authorization code.
- Redirect sau login chỉ chấp nhận đường dẫn cùng origin và đúng workspace được cấp.
- ID token được xác minh bằng khóa công khai Google qua OIDC discovery/JWKS.
- `iss`, `aud`, `exp`, `nonce`, `email_verified` và `hd` được kiểm tra fail-closed.
- Định danh ổn định dùng `iss + sub`; email không được dùng làm primary key.
- Cookie production dùng tiền tố `__Host-` cho session, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Logout yêu cầu CSRF token gắn với session và dùng so sánh constant-time.
- Google token bị loại bỏ ngay sau khi lấy claims; session chỉ giữ identity QTS, tenant, role và CSRF token.
- Login endpoint có rate limit thứ cấp theo địa chỉ client đã chuẩn hóa. Production vẫn phải có rate limit ở reverse proxy/WAF.
- Backend không tin `X-Forwarded-For` mặc định. Chỉ đặt `QTS_TRUST_PROXY_HOPS` khi backend bị cô lập sau đúng chuỗi proxy đó.
- Response auth dùng `Cache-Control: no-store`, CSP, frame deny, `nosniff` và referrer policy.
- Auth audit event không chứa authorization code, ID token, access token, client secret, session ID hoặc CSRF token.

`hd` chứng minh tài khoản thuộc Google Workspace được chỉ định; kiểm tra đuôi email không đủ. Google ID token trong luồng này không cung cấp bằng chứng ứng dụng có thể dùng để khẳng định từng lần đăng nhập đã qua MFA. Nếu QTS bắt buộc MFA, phải cưỡng chế 2-Step Verification bằng chính sách Google Workspace và giám sát tuân thủ ở tầng quản trị danh tính.

## 12. Runbook vận hành

### Khởi động

1. Cấp biến môi trường từ secret manager hoặc `backend/.env` ở local.
2. Chạy `npm ci` và `npm run check`.
3. Khởi động backend.
4. Xác nhận `/api/v1/health`, `/api/v1/ready` và `/api/v1/auth/status` trả `200`.
5. Khởi động frontend hoặc reverse proxy production.
6. Xác nhận `/api` đi cùng origin với frontend.
7. Thực hiện login smoke test bằng tài khoản có membership thật.
8. Xác nhận cookie có `HttpOnly`, `Secure`, `SameSite=Lax` ở production và browser storage không có Google token.

### Theo dõi

- Thu thập stdout JSON và giới hạn quyền đọc vì event provisioning có email, issuer và subject.
- Cảnh báo khi `5xx`, `401`, `403`, `429`, latency hoặc process restart tăng bất thường.
- Theo dõi `auth_membership_not_found`, `auth_login_succeeded`, `auth_logout_succeeded`.
- Không ghi request header, cookie, authorization code hoặc token vào access log.
- Rate-limit `/api/v1/auth/login/google` và callback ở WAF/reverse proxy.

### Thay đổi quyền hoặc thu hồi tài khoản

1. Xóa hoặc sửa membership theo `iss + sub`.
2. Restart backend để nạp cấu hình mới.
3. Do store hiện ở RAM, restart sẽ thu hồi toàn bộ session trên instance.
4. Xác nhận tài khoản bị từ chối hoặc nhận role mới sau khi đăng nhập lại.
5. Ghi nhận người phê duyệt và lý do trong hệ thống quản trị thay đổi của QTS.

### Xoay Google Client Secret

1. Tạo secret mới trên Google Cloud và lưu vào secret manager.
2. Cập nhật `GOOGLE_CLIENT_SECRET` trên tất cả instance.
3. Rolling restart và smoke test login.
4. Thu hồi secret cũ sau khi xác nhận toàn bộ instance dùng secret mới.
5. Kiểm tra repository, image và log không chứa secret.

### Dừng và rollback

- Development: `Ctrl+C` tại từng terminal.
- Production: gửi `SIGTERM` và chờ event `api_shutdown_complete`.
- Rollback frontend và backend theo cùng release đã kiểm thử tương thích contract.
- Sau rollback, kiểm tra health, auth status, callback URI, cookie và một login thật.

## 13. Giới hạn trước production HA

Session và giao dịch OIDC hiện lưu trong RAM. Hệ quả:

- Restart backend làm mất toàn bộ session và giao dịch đang chờ.
- Không được chạy nhiều replica sau load balancer nếu chưa có sticky session.
- Sticky session chỉ là giải pháp tạm; production HA cần shared store như Redis/PostgreSQL với TTL, encryption, backup và giám sát.
- Membership được nạp từ env lúc khởi động; chưa có UI provisioning hay database RBAC.
- Auth audit mới ở stdout; chưa đáp ứng yêu cầu append-only/retention/forensic.
- Chưa có revocation theo từng session từ trang quản trị.

Không go-live portal nghiệp vụ cho đến khi có shared session store, authorization phía server trên từng API, tenant isolation test, audit bền vững, WAF, secret manager, SAST/SCA/secret scan, DAST và pentest.

## 14. Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| `AUTH_NOT_CONFIGURED` | Thiếu toàn bộ cấu hình OIDC | Kiểm tra `/auth/status` và biến backend |
| Backend dừng khi start | Chỉ cấu hình một phần hoặc env sai | Đọc lỗi tên biến; không bỏ qua validation |
| `redirect_uri_mismatch` | URI Google Cloud khác `QTS_PUBLIC_ORIGIN` | So khớp scheme, host, port và callback tuyệt đối |
| Cookie không tồn tại ở local | Mở sai origin hoặc bật `Secure` trên HTTP | Dùng thống nhất `http://localhost:5173` và local-only `Secure=false` |
| `INVALID_AUTH_TRANSACTION` | State/cookie hết hạn, callback lặp lại hoặc đổi origin | Bắt đầu lại login, không refresh callback |
| `OIDC_RESPONSE_INVALID` | Code/token/nonce/chữ ký không hợp lệ | Kiểm tra thời gian máy, client và log backend |
| `HOSTED_DOMAIN_NOT_ALLOWED` | Claim `hd` không khớp | Kiểm tra Google Workspace account và cấu hình domain |
| `MEMBERSHIP_NOT_FOUND` | Chưa có cặp `iss + sub` | Dùng audit event để cấp đúng membership |
| Route báo không có quyền | Session thuộc workspace khác | Kiểm tra role mapping phía backend |
| `429 AUTH_RATE_LIMITED` | Quá nhiều lần bắt đầu login | Chờ `Retry-After`, kiểm tra bot/WAF |
| Proxy `/api` lỗi | Backend chưa chạy hoặc sai `QTS_API_ORIGIN` | Kiểm tra health trực tiếp rồi kiểm tra Vite proxy |

## 15. Tài liệu liên quan

- [Backend](backend/README.md)
- [Frontend](frontend/README.md)
- [OpenAPI](docs/api/openapi.yaml)
- [ADR-004: Google OIDC và server session](docs/decisions/ADR-004-google-oidc-and-server-session.md)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google: Verify the ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Google OAuth 2.0 Web Server](https://developers.google.com/identity/protocols/oauth2/web-server)
- [openid-client](https://github.com/panva/openid-client)
