# QTS Operations Portal

QTS Operations Portal là monorepo gồm frontend React/Vite và backend Node.js dành cho nền tảng công nghệ, an ninh mạng của QTS tại Việt Nam.

Repository hiện **không chứa dữ liệu vận hành dựng sẵn** và **không có cơ chế đăng nhập cục bộ**. Client Portal và Internal Portal chỉ được mở sau khi có IAM, session phía server và API nghiệp vụ thật. Trang công ty tại `/company` và các endpoint hạ tầng backend vẫn hoạt động bình thường.

## Mục lục

- [Khởi động nhanh](#khởi-động-nhanh)
- [Trạng thái hiện tại](#trạng-thái-hiện-tại)
- [Kiến trúc](#kiến-trúc)
- [Phân chia frontend và backend](#phân-chia-frontend-và-backend)
- [Công nghệ](#công-nghệ)
- [Cài đặt chi tiết](#cài-đặt-chi-tiết)
- [Các lệnh vận hành](#các-lệnh-vận-hành)
- [Route và endpoint](#route-và-endpoint)
- [Chính sách dữ liệu](#chính-sách-dữ-liệu)
- [Bảo mật](#bảo-mật)
- [Build và triển khai](#build-và-triển-khai)
- [Runbook vận hành](#runbook-vận-hành)
- [Yêu cầu để mở Client Portal](#yêu-cầu-để-mở-client-portal)
- [Yêu cầu để mở Internal Portal](#yêu-cầu-để-mở-internal-portal)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

## Khởi động nhanh

Yêu cầu Node.js `^20.19.0 || >=22.12.0`.

```powershell
cd D:\hoapuiii\Code\qts-portal
node --version
npm --version
npm ci
```

Mở hai terminal tại thư mục gốc.

Terminal backend:

```powershell
npm run dev:backend
```

Terminal frontend:

```powershell
npm run dev:frontend
```

Địa chỉ kiểm tra:

| Thành phần | URL |
| --- | --- |
| Frontend | `http://127.0.0.1:5173/` |
| Trang công ty | `http://127.0.0.1:5173/company` |
| Backend health | `http://127.0.0.1:8080/api/v1/health` |
| Backend readiness | `http://127.0.0.1:8080/api/v1/ready` |
| Health qua frontend proxy | `http://127.0.0.1:5173/api/v1/health` |

Dừng từng dịch vụ bằng `Ctrl+C` trong terminal tương ứng.

## Trạng thái hiện tại

| Hạng mục | Trạng thái | Hành vi |
| --- | --- | --- |
| Trang công ty QTS | Hoạt động | Nội dung công nghệ, an ninh, dịch vụ và biểu mẫu kiểm tra yêu cầu |
| Cổng truy cập | Hoạt động ở trạng thái khóa | Không có email, mật khẩu, OTP, SSO hoặc tài khoản cục bộ |
| Client Portal | Chưa mở | Route hiển thị yêu cầu tích hợp IAM và API, không hiển thị dữ liệu |
| Internal Portal | Chưa mở | Route hiển thị yêu cầu tích hợp IAM và API, không hiển thị dữ liệu SOC |
| Backend hạ tầng | Hoạt động | Health, readiness, JSON error, timeout và graceful shutdown |
| API nghiệp vụ | Chưa triển khai | Không có endpoint ticket, asset, billing, customer, incident hoặc audit |
| Database/search | Chưa triển khai | Không có PostgreSQL, OpenSearch hoặc Elasticsearch |
| IAM | Chưa triển khai | Chưa có OIDC, SAML, MFA, session hoặc recovery |
| Telemetry | Chưa triển khai | Không nhận hoặc hiển thị sự kiện an ninh |

Không nhập credential, token, API key, dữ liệu khách hàng hoặc thông tin hạ tầng thật vào frontend hiện tại.

## Kiến trúc

```text
Browser
  -> frontend (React/Vite)
      -> /company                 website công ty
      -> /                        trạng thái IAM chưa cấu hình
      -> /client/*                trạng thái Client Portal chưa mở
      -> /admin/*                 trạng thái Internal Portal chưa mở
      -> /api/*                   proxy development
          -> backend (Node.js)
              -> /api/v1/health
              -> /api/v1/ready
```

Production nên phục vụ frontend và `/api` dưới cùng origin qua reverse proxy. Không bật CORS wildcard chỉ để kết nối hai phân hệ.

### Cấu trúc thư mục

```text
qts-portal/
|-- backend/
|   |-- src/
|   |   |-- app.js                 # HTTP handler và response JSON
|   |   `-- server.js              # Server lifecycle, timeout và shutdown
|   |-- test/app.test.js           # Integration test HTTP
|   |-- package.json
|   `-- README.md
|-- docs/
|   |-- api/openapi.yaml           # Hợp đồng API hạ tầng
|   |-- decisions/                 # Architecture Decision Records
|   |-- QTS_WORKSPACE_PLAN.md
|   `-- QTS_WORKSPACE_SPEC.md
|-- frontend/
|   |-- public/                     # Logo, security headers và SPA fallback
|   |-- src/
|   |   |-- components/            # Website, cổng truy cập và UI dùng chung
|   |   |-- lib/                   # Navigation, contact validation và search
|   |   |-- pages/MarketingPortal.tsx
|   |   |-- App.tsx                # Route và trạng thái workspace bị khóa
|   |   `-- portal.css
|   |-- tokens.css
|   |-- package.json
|   `-- README.md
|-- package.json                    # npm workspace scripts
|-- package-lock.json               # Lockfile chung
`-- README.md
```

## Phân chia frontend và backend

### Frontend

- Chỉ chịu trách nhiệm render giao diện và điều hướng trình duyệt.
- Không chứa người dùng, tenant, cảnh báo, ticket, tài sản, hóa đơn, sự cố, audit event hoặc credential reference.
- Không tạo session và không cung cấp cách vượt qua IAM.
- Không tạo nghiệp vụ cục bộ khi backend chưa có endpoint tương ứng.
- Gọi backend qua đường dẫn cùng origin `/api/*`.

### Backend

- Chạy độc lập trên `127.0.0.1:8080` theo mặc định.
- Chỉ cung cấp liveness và readiness.
- Không nhận credential hoặc dữ liệu nghiệp vụ.
- Không bật CORS theo mặc định.
- Trả lỗi JSON thống nhất và không lộ stack trace qua HTTP response.

### Ranh giới bắt buộc khi tích hợp

Backend phải lấy danh tính, tenant và quyền từ session đã xác minh. Không tin `role`, `tenantId`, user ID hoặc permission do trình duyệt tự gửi. Frontend RBAC chỉ được dùng để điều chỉnh UX sau khi backend đã cho phép request.

## Công nghệ

| Lớp | Công nghệ | Phiên bản/vai trò |
| --- | --- | --- |
| UI | React, React DOM | `19.2.8` |
| Ngôn ngữ frontend | TypeScript strict | `6.0.3` |
| Dev/build frontend | Vite | `7.3.6`, target ES2022 |
| Icon | Lucide React | `1.28.0` |
| Style | CSS + custom properties | Design token ba tầng |
| Frontend test | Vitest, Testing Library | Component và validation |
| Backend runtime | Node.js HTTP | Không có runtime dependency |
| Backend test | Node.js test runner | Kiểm thử qua HTTP server thật |
| API contract | OpenAPI | `3.1.0` |
| Monorepo | npm workspaces | Một lockfile cho hai package |

Không còn thư viện biểu đồ vì chưa có nguồn dữ liệu nghiệp vụ để trực quan hóa.

## Cài đặt chi tiết

### 1. Kiểm tra môi trường

```powershell
node --version
npm --version
```

Node phải thỏa `^20.19.0 || >=22.12.0`.

### 2. Cài dependency

```powershell
npm ci
```

Máy mới, CI và release phải dùng `npm ci`. Chỉ dùng `npm install` khi chủ động thay đổi dependency và review cả `package.json` lẫn `package-lock.json`.

### 3. Biến môi trường

Không cần biến môi trường cho cấu hình local mặc định.

| Biến | Phân hệ | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `QTS_API_HOST` | Backend | `127.0.0.1` | Địa chỉ backend lắng nghe |
| `QTS_API_PORT` | Backend | `8080` | Cổng backend từ `1` đến `65535` |
| `QTS_API_ORIGIN` | Frontend dev | `http://127.0.0.1:8080` | Đích proxy cho `/api/*` |

Ví dụ đổi cổng backend:

```powershell
$env:QTS_API_PORT = "8081"
npm run dev:backend
```

Terminal frontend phải dùng cùng origin:

```powershell
$env:QTS_API_ORIGIN = "http://127.0.0.1:8081"
npm run dev:frontend
```

Không đặt secret vào biến `VITE_*`; giá trị này có thể xuất hiện trong bundle trình duyệt.

## Các lệnh vận hành

| Lệnh | Mục đích |
| --- | --- |
| `npm ci` | Cài đúng lockfile |
| `npm run dev` | Chạy frontend |
| `npm run dev:frontend` | Chạy Vite có HMR |
| `npm run dev:backend` | Chạy backend bằng Node watch mode |
| `npm run start:backend` | Chạy backend không có watch mode |
| `npm test` | Chạy test frontend và backend |
| `npm run test:frontend` | Chỉ chạy frontend test |
| `npm run test:backend` | Chỉ chạy backend test |
| `npm run typecheck` | Kiểm tra TypeScript strict |
| `npm run lint` | Lint frontend và syntax check backend |
| `npm run build` | Build frontend và kiểm tra backend |
| `npm run check` | Typecheck, lint, test và build toàn workspace |
| `npm run preview` | Phục vụ `frontend/dist/` để smoke test |
| `npm audit --audit-level=moderate` | Kiểm tra advisory dependency |

## Route và endpoint

### Frontend

| Route | Trạng thái |
| --- | --- |
| `/` | Cổng truy cập, thông báo IAM chưa cấu hình |
| `/company` | Website công ty QTS |
| `/client` và `/client/*` | Trạng thái khóa, không dữ liệu |
| `/admin` và `/admin/*` | Trạng thái khóa, không dữ liệu |
| Route khác | Trang `404` |

### Backend

| Method | Path | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Công khai | Liveness của HTTP process |
| `GET` | `/api/v1/ready` | Công khai | Readiness nhận lưu lượng |

Hợp đồng chi tiết: [OpenAPI](docs/api/openapi.yaml).

## Chính sách dữ liệu

Repository không được chứa:

1. Tài khoản, email, tên người dùng hoặc persona dựng sẵn.
2. Tenant, khách hàng, liên hệ khẩn cấp hoặc account owner dựng sẵn.
3. KPI, telemetry, cảnh báo, lỗ hổng hoặc sự cố dựng sẵn.
4. Ticket, SLA, tài sản, license, hợp đồng hoặc hóa đơn dựng sẵn.
5. Audit event, ca trực, integration hoặc credential reference dựng sẵn.
6. Mật khẩu, OTP, token, API key, private key hoặc database credential.

Nội dung giới thiệu công ty, danh mục dịch vụ và hướng dẫn bảo mật là nội dung biên tập, không phải dữ liệu vận hành.

Khi có API thật, frontend phải xử lý riêng các trạng thái loading, error, empty và forbidden. Không dùng dữ liệu cục bộ làm fallback khi request thất bại.

## Bảo mật

### Kiểm soát hiện có

- Không có form credential cục bộ hoặc cơ chế tạo session trong trình duyệt.
- Không lưu auth token trong `localStorage` hoặc `sessionStorage`.
- Route Client/Internal không hiển thị dữ liệu khi IAM chưa cấu hình.
- Không dùng `dangerouslySetInnerHTML`.
- Backend không bật CORS wildcard.
- Backend đặt `Cache-Control: no-store`, CSP, frame deny, `nosniff` và referrer policy.
- Backend giới hạn header, request timeout, header timeout và keep-alive timeout.
- Dependency được khóa bằng lockfile và kiểm tra bằng `npm audit`.

### Bắt buộc trước khi mở truy cập

1. IdP hỗ trợ OIDC/SAML và MFA TOTP hoặc WebAuthn.
2. Session dùng cookie `httpOnly`, `secure`, `sameSite`.
3. Backend xác thực và kiểm quyền trên mọi endpoint nghiệp vụ.
4. Tenant được lấy từ session, không lấy từ input tùy ý.
5. Rate limit, lockout và kiểm soát credential stuffing cho auth endpoint.
6. CSRF protection phù hợp cơ chế session.
7. TLS 1.2 trở lên ở mọi kết nối ngoài process.
8. PostgreSQL/OpenSearch/object storage có encryption, backup và retention rõ ràng.
9. Audit append-only và có timestamp tin cậy.
10. SAST, SCA, secret scan, IaC scan, DAST và pentest trước go-live.

## Build và triển khai

### Build

```powershell
npm ci
npm run check
npm audit --audit-level=moderate
```

Artifact frontend nằm tại `frontend/dist/`. Backend chạy trực tiếp mã nguồn `backend/src/`; bước build backend hiện là syntax gate.

### Kiểm tra artifact frontend

```powershell
npm run preview
```

Mở `http://127.0.0.1:4173/` và kiểm tra `/`, `/company`, `/client/overview`, `/admin/soc` cùng một route `404`.

### Yêu cầu reverse proxy

1. Phục vụ `frontend/dist/index.html` cho route SPA không trùng asset.
2. Chuyển `/api/*` tới backend.
3. Bắt buộc HTTPS và chuyển HTTP sang HTTPS.
4. Giữ asset hash với cache dài hạn; không cache HTML quá dài.
5. Áp dụng security header từ `frontend/public/_headers` bằng cấu hình native của nền tảng.
6. Không dùng `vite preview` làm production server.

## Runbook vận hành

### Khởi động

1. Cài dependency bằng `npm ci`.
2. Khởi động backend.
3. Xác nhận health và readiness trả `200`.
4. Khởi động frontend.
5. Xác nhận frontend và proxy `/api/v1/health` trả `200`.

### Kiểm tra trước release

1. Chạy `npm run check`.
2. Chạy `npm audit --audit-level=moderate`.
3. Validate `docs/api/openapi.yaml`.
4. Kiểm tra không có dữ liệu vận hành hoặc secret trong source/build.
5. Smoke test desktop và mobile.
6. Kiểm tra Console không có error và Network không phát sinh request ngoài dự kiến.
7. Ghi release ID và artifact ID phục vụ rollback.

### Kiểm tra sau deploy

1. Kiểm tra `/`, `/company`, `/client/overview` và `/admin/soc`.
2. Kiểm tra health/readiness trực tiếp và qua reverse proxy.
3. Kiểm tra CSP, frame policy, `nosniff` và cache header trên response thật.
4. Xác nhận Client/Internal vẫn khóa nếu IAM chưa được tích hợp.
5. Theo dõi HTTP `4xx/5xx`, latency, process restart và CSP violation.

### Dừng dịch vụ

- Development: `Ctrl+C` ở từng terminal.
- Production: gửi `SIGTERM`, ngừng cấp request mới và chờ log `api_shutdown_complete`.

### Rollback

1. Chọn frontend artifact và backend release gần nhất đã xác minh tương thích.
2. Rollback backend trước nếu contract hiện tại không tương thích.
3. Chuyển CDN/static host về artifact frontend cũ.
4. Revalidate HTML entrypoint.
5. Kiểm tra lại route, health, readiness và security headers.

## Yêu cầu để mở Client Portal

Client Portal chỉ được triển khai dữ liệu sau khi có:

- Session khách hàng đã xác minh.
- Tenant isolation và cross-tenant denial test.
- API versioned cho dashboard, threat, ticket, asset, billing, knowledge và audit.
- Signed URL ngắn hạn cho file báo cáo/hóa đơn.
- Validation server-side và idempotency cho mutation.
- Loading/error/empty/forbidden state ở frontend.
- Audit event phía server cho mọi hành động nhạy cảm.

## Yêu cầu để mở Internal Portal

Internal Portal chỉ được triển khai dữ liệu sau khi có:

- Danh tính nhân viên từ IdP và chính sách đặc quyền.
- RBAC chính thức cho admin, SOC L1/L2/L3 và account manager.
- API multi-tenant có authorization phía server.
- Quy trình dispatch, shift handover và escalation được phê duyệt.
- Vault/KMS cho integration credential.
- Audit append-only, retention và export forensic.
- Break-glass access, approval và access review định kỳ.

## Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `npm ci` báo `EBADENGINE` | Node không đúng phiên bản | Dùng Node thỏa `^20.19.0 || >=22.12.0` |
| Lockfile không khớp | Manifest đã thay đổi | Chạy `npm install`, review và cập nhật lockfile |
| Cổng `5173` bận | Frontend khác đang chạy | `npm run dev:frontend -- --port 5174` |
| Cổng `8080` bận | Backend khác đang chạy | Đổi `QTS_API_PORT` và `QTS_API_ORIGIN` |
| Proxy `/api` lỗi kết nối | Backend chưa chạy hoặc sai origin | Kiểm tra backend health và biến `QTS_API_ORIGIN` |
| Client/Internal không mở | Hành vi đúng khi chưa có IAM/API | Hoàn tất các yêu cầu tích hợp, không thêm bypass cục bộ |
| Refresh route trả `404` | Static host thiếu SPA fallback | Rewrite về `index.html` |
| Security header không có hiệu lực | Host không hỗ trợ `_headers` | Chuyển policy sang cấu hình native |
| `npm audit` báo advisory | Dependency có lỗ hổng đã biết | Review reachability và nâng/thay package phù hợp |

## Tài liệu liên quan

- [Hướng dẫn frontend](frontend/README.md)
- [Hướng dẫn backend](backend/README.md)
- [Đặc tả workspace](docs/QTS_WORKSPACE_SPEC.md)
- [Kế hoạch workspace](docs/QTS_WORKSPACE_PLAN.md)
- [Hợp đồng OpenAPI](docs/api/openapi.yaml)
- [ADR-001: Ranh giới frontend và routing](docs/decisions/ADR-001-frontend-prototype-boundary-and-routing.md)
- [ADR-002: npm workspaces](docs/decisions/ADR-002-frontend-backend-workspaces.md)
- [ADR-003: Không lưu dữ liệu vận hành trong frontend](docs/decisions/ADR-003-remove-local-operational-data.md)
