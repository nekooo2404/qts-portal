# QTS One Portal

QTS One là nền tảng dịch vụ số hợp nhất dành cho QTS Việt Nam. Một backend dùng chung phục vụ ba bề mặt sản phẩm với ranh giới truy cập rõ ràng:

- **Corporate Website**: giới thiệu năng lực, dịch vụ, giải pháp, dự án và tiếp nhận yêu cầu tư vấn doanh nghiệp.
- **Client Portal**: khách hàng theo dõi cảnh báo, tài sản, license, ticket/SLA, hợp đồng, hóa đơn, báo cáo và tài khoản thuộc tenant của mình.
- **Internal Portal**: SOC, kỹ sư, account manager và quản trị viên QTS giám sát nhiều khách hàng, điều phối sự cố, quản lý tích hợp, ca trực và audit.

Portal dùng Google OAuth 2.0/OpenID Connect theo Authorization Code Flow. Backend là bên duy nhất xử lý authorization code, Google Client Secret và ID token; browser chỉ nhận session cookie opaque của QTS.

> Repository không seed user, tenant, cảnh báo, ticket, tài sản, hóa đơn hay số liệu vận hành giả. Khi database chưa có bản ghi, giao diện hiển thị empty state và các chỉ số thực tế bằng `0`.

## 1. Trạng thái triển khai

| Nhóm | Đã triển khai |
| --- | --- |
| Corporate Website | Trang marketing đa route, SEO metadata, service/solution detail, tìm kiếm và form tư vấn |
| IAM | Google OIDC, `state`, `nonce`, PKCE S256, kiểm tra claim, membership theo `iss + sub`, session PostgreSQL, CSRF, RBAC |
| Multi-tenant | Tenant scope lấy từ session, internal scope có chọn tenant, PostgreSQL Row-Level Security |
| Client Portal | Dashboard, cảnh báo, ticket, tài sản, license, hợp đồng, hóa đơn, tài liệu, knowledge base, thành viên, audit |
| Internal Portal | SOC dashboard đa khách hàng, cảnh báo, điều phối ticket, khách hàng, tài sản, license, billing, tài liệu, knowledge, tích hợp, thành viên, ca trực, audit |
| Dữ liệu | PostgreSQL 17, migration tiến/lùi, phân trang, tìm kiếm, optimistic concurrency, audit append-only |
| Bảo vệ dữ liệu | Cookie HttpOnly, secret tích hợp AES-256-GCM, checksum tài liệu, validation fail-closed, request ID |
| Giao diện | Responsive desktop/mobile, dark security workspace, loading/empty/error/denied state, không fallback dữ liệu cục bộ |

Đây là nền tảng vận hành đầy đủ ở mức ứng dụng. Trước khi go-live production vẫn phải triển khai TLS/WAF, secret manager/KMS, PostgreSQL HA/backup, giám sát tập trung, quét file, connector ingestion, kiểm thử tải và pentest. Xem [Giới hạn và việc cần làm trước production](#17-giới-hạn-và-việc-cần-làm-trước-production).

## 2. Kiến trúc

```text
Browser
  |
  | HTTPS, same-origin cookie
  v
Frontend Next.js App Router
  |-- website công khai
  |-- /portal/*
  |-- /admin/*
  |
  | /api/*
  v
Backend Node.js
  |-- Google OIDC discovery, JWKS và token endpoint
  |-- Session, CSRF, RBAC và tenant scope
  |-- Validation, idempotency và audit
  v
PostgreSQL 17
  |-- identity, session và OIDC transaction
  |-- dữ liệu nghiệp vụ
  |-- Row-Level Security
  `-- audit append-only
```

Frontend và backend tách rõ trách nhiệm:

- **Frontend** chỉ render dữ liệu API, điều hướng và gửi mutation kèm CSRF token. Frontend không quyết định quyền cuối cùng.
- **Backend** xác thực session, lấy role/tenant từ database, kiểm tra permission, validate input và ghi audit cho mutation.
- **PostgreSQL** lưu session, OIDC transaction, membership và toàn bộ dữ liệu nghiệp vụ. RLS là lớp bảo vệ bổ sung bên dưới backend policy.
- **Google** chỉ là Identity Provider. Email dùng để khớp lời mời lần đầu; định danh ổn định sau đó luôn là cặp `iss + sub`.

## 3. Cấu trúc repository

```text
qts-portal/
|-- frontend/                     # Next.js 16 + React 19 + TypeScript
|   |-- src/app/                  # Route, metadata và static generation
|   |-- src/components/           # Marketing, portal và UI primitives
|   |-- src/screens/              # Website và Client/Internal workspace
|   `-- src/portal/               # API client, permission, resource config
|-- backend/                      # Node.js ESM HTTP API
|   |-- src/app.js                # Route HTTP, cookie, CSRF, body limit
|   |-- src/auth-*.js             # OIDC, session và auth config
|   |-- src/portal-*.js           # Policy, schema, service, repository
|   |-- src/database.js           # PostgreSQL pool và tenant transaction
|   |-- migrations/               # Migration SQL tiến/lùi
|   |-- test/                     # Unit/HTTP tests
|   `-- integration/              # PostgreSQL integration tests
|-- docs/api/openapi.yaml         # Hợp đồng API
|-- docs/decisions/               # Architecture Decision Records
|-- compose.yaml                  # PostgreSQL local
|-- package.json                  # npm workspaces và quality gate
`-- README.md                     # Tài liệu cài đặt/vận hành chính
```

## 4. Công nghệ

| Lớp | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | React `19.2.8`, TypeScript `6.0.3` | UI component và type-safe client |
| Build | Next.js `16.3.0` | App Router, dev rewrite `/api`, static export và metadata |
| UI | CSS custom properties, Lucide React | Design system, responsive layout và icon |
| Backend | Node.js native HTTP, ESM | API, lifecycle, timeout và graceful shutdown |
| OIDC | `openid-client` `6.8.4` | Discovery, PKCE, token exchange, JWKS/ID token validation |
| Database | PostgreSQL `17`, `pg` `8.22.0` | Transaction, RLS, persistence, search và audit |
| Mã hóa | Node.js Crypto, AES-256-GCM | Mã hóa secret tích hợp tại application layer |
| Test | Vitest, Testing Library, Node test runner | Frontend, backend và integration database |
| Contract | OpenAPI `3.1` | Tài liệu endpoint và error envelope |
| Local infra | Docker Compose | Chạy PostgreSQL cô lập trên `127.0.0.1:5432` |

Elasticsearch, Kubernetes và cloud provider chưa được đưa vào repository này. PostgreSQL đang đảm nhiệm tìm kiếm nghiệp vụ có cấu trúc; không nên mô tả hệ thống hiện tại là đã có Elasticsearch.

## 5. Chức năng và route

### 5.1. Client Portal

| Route | Chức năng |
| --- | --- |
| `/portal/overview` | Chỉ số cảnh báo, ticket/SLA, sức khỏe tài sản, license và xu hướng 7 ngày |
| `/portal/alerts` | Xem cảnh báo trong đúng tenant |
| `/portal/tickets` | Tạo ticket, theo dõi SLA, trao đổi với QTS |
| `/portal/assets` | Xem tài sản, criticality, health và lần ghi nhận cuối |
| `/portal/licenses` | Theo dõi license, số lượng và ngày hết hạn |
| `/portal/contracts` | Xem hợp đồng và thời hạn |
| `/portal/invoices` | Xem hóa đơn và trạng thái thanh toán |
| `/portal/documents` | Xem/tải báo cáo và tài liệu được cấp quyền |
| `/portal/knowledge` | Xem knowledge base dành cho khách hàng |
| `/portal/team` | `client_admin` mời, đổi role hoặc vô hiệu hóa thành viên tenant |
| `/portal/audit` | Xem hoạt động thuộc tenant theo quyền |

### 5.2. Internal Portal

| Route | Chức năng |
| --- | --- |
| `/admin/soc` | Tổng quan toàn bộ tenant hoặc tenant đang chọn |
| `/admin/alerts` | Tạo, xác nhận và xử lý cảnh báo |
| `/admin/tickets` | Điều phối ticket, severity, assignee, workflow và ghi chú nội bộ |
| `/admin/customers` | Hồ sơ tenant, gói dịch vụ, liên hệ khẩn cấp và SLA theo severity |
| `/admin/assets` | Quản lý inventory và sức khỏe tài sản |
| `/admin/licenses` | Quản lý license và thời hạn |
| `/admin/contracts` | Quản lý hợp đồng |
| `/admin/invoices` | Quản lý hóa đơn |
| `/admin/documents` | Tải báo cáo/tài liệu lên và tải xuống có checksum |
| `/admin/knowledge` | Soạn, xuất bản và lưu trữ bài viết |
| `/admin/integrations` | Lưu metadata SIEM/SOAR/EDR/webhook và secret đã mã hóa |
| `/admin/team` | Mời và quản lý tài khoản client/internal theo quyền |
| `/admin/shifts` | Lập ca SOC L1/L2/L3, thời gian và ghi chú bàn giao |
| `/admin/audit` | Tra cứu audit theo tenant, action, outcome và resource |

Dashboard tự làm mới mỗi 30 giây bằng dữ liệu đã lưu trong PostgreSQL. Đây không phải WebSocket và repository chưa có worker tự kéo log từ SIEM/EDR.

## 6. RBAC

Backend là nguồn quyết định quyền. Việc ẩn nút/menu ở frontend chỉ cải thiện UX.

| Role | Workspace | Quyền chính |
| --- | --- | --- |
| `client_viewer` | Client | Chỉ đọc dashboard, cảnh báo, ticket, tài sản, billing, tài liệu, knowledge và audit |
| `technical` | Client | Quyền đọc như viewer, tạo/comment ticket, xem cấu hình tích hợp |
| `billing` | Client | Dashboard, ticket, tạo ticket, hợp đồng/hóa đơn, tài liệu và knowledge |
| `client_admin` | Client | Quyền đọc tenant, tạo ticket, xem tích hợp, mời và quản lý role client |
| `soc_l1` | Internal | Dashboard đa tenant, cảnh báo, ticket, tài sản đọc, tài liệu đọc, ca trực đọc, audit |
| `soc_l2` | Internal | Thêm quyền sửa tài sản/tài liệu, xem tích hợp và quản lý ca trực |
| `soc_l3` | Internal | Thêm quyền quản lý knowledge base |
| `account_manager` | Internal | Quản lý tenant, asset, billing, document, knowledge; xem thành viên/tích hợp/ca trực/audit |
| `qts_admin` | Internal | Toàn bộ permission, bao gồm tích hợp, thành viên và role internal |

Client role không thể chuyển scope sang tenant khác. `client_admin` chỉ được cấp bốn role client. Internal role có thể truy vấn nhiều tenant theo permission và tenant selector.

## 7. Yêu cầu môi trường

- Windows PowerShell, macOS hoặc Linux.
- Node.js `^20.19.0 || >=22.12.0`.
- npm tương thích với `package-lock.json`.
- Docker Desktop/Engine có Docker Compose cho môi trường local.
- Google Cloud project có OAuth consent screen và OAuth Client loại **Web application**.
- Tài khoản Google thật để smoke test đăng nhập.

Kiểm tra công cụ:

```powershell
node --version
npm --version
docker --version
docker compose version
```

## 8. Cài đặt local từ đầu

### Bước 1: cài dependency

```powershell
cd D:\Projects\qts-portal
npm ci
```

### Bước 2: tạo file môi trường backend

```powershell
Copy-Item backend\.env.example backend\.env
```

Sinh password PostgreSQL dạng hex, an toàn khi đặt trực tiếp trong database URL:

```powershell
node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"
```

Sinh khóa AES-256 đúng 32 byte, mã hóa Base64:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Điền password thứ nhất vào cả `QTS_POSTGRES_PASSWORD` và phần password của `QTS_DATABASE_URL`. Điền giá trị thứ hai vào `QTS_DATA_ENCRYPTION_KEY`.

Ví dụ cấu trúc, không dùng nguyên giá trị minh họa:

```dotenv
QTS_POSTGRES_PASSWORD=<postgres-password-vua-sinh>
QTS_DATABASE_URL=postgresql://qts:<postgres-password-vua-sinh>@127.0.0.1:5432/qts_portal
QTS_DATA_ENCRYPTION_KEY=<base64-32-byte-key-vua-sinh>
```

Nếu password chứa ký tự đặc biệt thay vì chuỗi hex, phải URL-encode phần password trong `QTS_DATABASE_URL`.

### Bước 3: chạy PostgreSQL

```powershell
docker compose --env-file backend/.env up -d database
docker compose --env-file backend/.env ps
```

Chạy migration chủ động:

```powershell
npm run db:migrate:env --workspace @qts/backend
```

Backend cũng tự chạy các migration chưa áp dụng khi khởi động. Migration được ghi nhận trong bảng `schema_migrations` và có advisory lock để tránh hai process migrate đồng thời.

### Bước 4: chạy backend

Mở terminal thứ nhất:

```powershell
cd D:\Projects\qts-portal
npm run dev:backend:env
```

Kiểm tra:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/v1/health
Invoke-RestMethod http://127.0.0.1:8080/api/v1/ready
Invoke-RestMethod http://127.0.0.1:8080/api/v1/auth/status
```

### Bước 5: chạy frontend

Mở terminal thứ hai:

```powershell
cd D:\Projects\qts-portal
npm run dev:frontend
```

Mở **`http://127.0.0.1:3000`**. Không đổi qua lại giữa `localhost` và `127.0.0.1` trong một luồng OIDC vì cookie giao dịch và redirect URI phụ thuộc hostname chính xác.

## 9. Tạo Google OAuth Client

1. Mở Google Cloud Console và chọn đúng project.
2. Vào **Google Auth Platform**; hoàn tất Branding, Audience và Data Access.
3. Chọn scope `openid`, `email`, `profile`.
4. Vào **Clients** > **Create client** > **Web application**.
5. Khai báo local development:

```text
Authorized JavaScript origin: http://127.0.0.1:3000
Authorized redirect URI:      http://127.0.0.1:3000/api/v1/auth/callback/google
```

6. Khai báo production bằng public HTTPS origin thực tế:

```text
Authorized JavaScript origin: https://portal.example.vn
Authorized redirect URI:      https://portal.example.vn/api/v1/auth/callback/google
```

7. Điền Client ID và Client Secret vào `backend/.env`:

```dotenv
QTS_PUBLIC_ORIGIN=http://127.0.0.1:3000
QTS_AUTH_COOKIE_SECURE=false
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_WORKSPACE_DOMAIN=
QTS_AUTH_MEMBERSHIPS_JSON=[]
```

`GOOGLE_CLIENT_SECRET` chỉ tồn tại ở backend `.env`/secret manager. Không đặt secret trong biến `NEXT_PUBLIC_*`, frontend, Docker image, log, ticket hay Git.

Nếu chỉ cho phép tài khoản Google Workspace QTS, điền domain thực tế vào `GOOGLE_WORKSPACE_DOMAIN`. Backend kiểm tra claim `hd`; kiểm tra đuôi email không được dùng thay thế. MFA/2-Step Verification phải được cưỡng chế bằng chính sách Google Workspace vì ID token của luồng này không chứng minh riêng từng lần đăng nhập đã step-up MFA.

## 10. Biến môi trường backend

| Biến | Bắt buộc | Cách lấy / quy tắc |
| --- | --- | --- |
| `NODE_ENV` | Có | `development` local, `production` khi deploy |
| `QTS_API_HOST` | Không | Mặc định `127.0.0.1`; production thường bind private interface/container |
| `QTS_API_PORT` | Không | Mặc định `8080`, phạm vi `1..65535` |
| `QTS_TRUST_PROXY_HOPS` | Không | Mặc định `0`; chỉ đặt đúng số reverse proxy tin cậy trước backend |
| `QTS_PUBLIC_ORIGIN` | Có khi bật OIDC | Origin public chính xác, chỉ gồm scheme/host/port; production bắt buộc HTTPS |
| `QTS_AUTH_COOKIE_SECURE` | Có | `false` chỉ cho local HTTP; production bắt buộc `true` |
| `QTS_POSTGRES_PASSWORD` | Có với Compose | Tự sinh/secret manager; Compose dùng để tạo user `qts` |
| `QTS_DATABASE_URL` | Có | URL runtime; local dùng owner `qts`, production bắt buộc đăng nhập bằng role `qts_app` không có `SUPERUSER`/`BYPASSRLS` |
| `QTS_MIGRATION_DATABASE_URL` | Có ở production | URL owner/DDL riêng để chạy migration; không dùng credential này cho traffic ứng dụng |
| `QTS_DATABASE_SSL` | Có | `false` local; production bắt buộc `true` và CA phải được hệ thống tin cậy |
| `QTS_DATABASE_POOL_MAX` | Không | `2..50`, mặc định `10`; tính theo tổng số replica |
| `QTS_DATABASE_IDLE_TIMEOUT_MS` | Không | `1000..300000`, mặc định `30000` |
| `QTS_DATABASE_CONNECT_TIMEOUT_MS` | Không | `500..60000`, mặc định `5000` |
| `QTS_DATA_ENCRYPTION_KEY` | Có | Base64 giải mã đúng 32 byte; lưu trong secret manager/KMS-backed secret |
| `GOOGLE_CLIENT_ID` | Có khi bật OIDC | Google OAuth Client loại Web application |
| `GOOGLE_CLIENT_SECRET` | Có khi bật OIDC | Lấy cùng OAuth Client; backend-only secret |
| `GOOGLE_WORKSPACE_DOMAIN` | Không | Giá trị claim `hd` được phép; để trống nếu nhận tài khoản ngoài Workspace |
| `QTS_AUTH_MEMBERSHIPS_JSON` | Có khi bật OIDC | JSON bootstrap `iss + sub`; dùng `[]` khi không bootstrap thêm tài khoản |
| `QTS_AUTH_TRANSACTION_TTL_SECONDS` | Không | `120..900`, mặc định `600` |
| `QTS_SESSION_TTL_SECONDS` | Không | `900..86400`, mặc định `28800` (8 giờ) |

OIDC chỉ bật khi có đồng thời `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và `QTS_AUTH_MEMBERSHIPS_JSON` (mảng rỗng vẫn hợp lệ). Cấu hình thiếu một phần làm backend dừng ngay, không chạy ở trạng thái nửa cấu hình.

### 10.1. Tách quyền database ở production

Migration `005_runtime_database_role` tạo role nhóm `qts_app` với `NOLOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT` và `NOBYPASSRLS`, sau đó chỉ cấp quyền DML cần cho ứng dụng. DBA cấp `LOGIN` và password riêng qua kênh quản trị an toàn, ví dụ mở `psql` bằng tài khoản owner rồi dùng `\password qts_app`; không đặt password trực tiếp trong lịch sử shell.

Production phải dùng hai secret tách biệt:

```dotenv
NODE_ENV=production
QTS_DATABASE_URL=postgresql://qts_app:<runtime-password>@<database-host>/qts_portal
QTS_MIGRATION_DATABASE_URL=postgresql://<migration-owner>:<migration-password>@<database-host>/qts_portal
QTS_DATABASE_SSL=true
```

Release job dùng `QTS_MIGRATION_DATABASE_URL` để áp dụng migration, còn request runtime chỉ dùng `QTS_DATABASE_URL`. Backend production từ chối khởi động nếu thiếu URL migration hoặc nếu runtime connection không đúng role `qts_app`, là superuser, hay có `BYPASSRLS`. Ở local, Compose vẫn kết nối bằng owner `qts` để đơn giản hóa setup, nhưng mọi transaction nghiệp vụ đều hạ quyền bằng `SET LOCAL ROLE qts_app` trước khi đặt tenant scope.

## 11. Tạo superuser đầu tiên

Tạo một record `qts_admin` trong database là đủ để tài khoản đó đăng nhập Internal Portal, nhưng phải dùng đúng `iss + sub` của tài khoản Google.

### 11.1. Thu thập định danh an toàn

1. Đặt `QTS_AUTH_MEMBERSHIPS_JSON=[]` và khởi động lại backend.
2. Đăng nhập Google bằng tài khoản cần cấp quyền.
3. Backend trả `MEMBERSHIP_NOT_FOUND` và không phát session.
4. Truy vấn audit trong PostgreSQL:

```powershell
$qtsDatabaseContainer = docker compose --env-file backend/.env ps -q database
docker exec $qtsDatabaseContainer psql -U qts -d qts_portal -c "SELECT actor_issuer, actor_subject, metadata->>'email' AS email, created_at FROM audit_events WHERE action = 'auth.membership_not_found' ORDER BY created_at DESC LIMIT 10;"
```

5. Xác minh người yêu cầu qua quy trình nội bộ QTS. Email chỉ để đối chiếu; lấy `actor_issuer` và `actor_subject` làm định danh.

### 11.2. Bootstrap `qts_admin`

Đặt JSON trên một dòng trong `backend/.env`:

```dotenv
QTS_AUTH_MEMBERSHIPS_JSON=[{"issuer":"https://accounts.google.com","subject":"<actor_subject>","tenantId":"qts-vn","role":"qts_admin"}]
```

Khởi động lại backend. Startup sẽ tạo tenant `qts-vn` nếu chưa có và upsert membership. Đăng nhập lại tại `http://127.0.0.1:3000`; tài khoản sẽ vào `/admin/soc`.

Lưu ý quan trọng: membership còn nằm trong `QTS_AUTH_MEMBERSHIPS_JSON` sẽ được upsert lại sau mỗi lần backend khởi động. Sau khi bootstrap thành công và có ít nhất một quản trị viên dự phòng, có thể đổi biến về `[]`; record trong PostgreSQL vẫn tồn tại và từ đó được quản lý qua portal. Nếu giữ entry làm break-glass account, phải quản trị file/secret và quy trình phê duyệt tương ứng.

## 12. Thêm tài khoản đăng nhập hằng ngày

Sau khi có `qts_admin`, không cần lấy `sub` thủ công cho từng người dùng:

1. Vào **Internal Portal** > **Thành viên**.
2. Với tài khoản khách hàng, chọn tenant cần cấp. Tenant phải được tạo trước tại **Khách hàng**.
3. Chọn **Mời tài khoản**, nhập email Google đã xác minh, role và hạn dùng lời mời.
4. Lời mời phải hết hạn trong tương lai và không quá 30 ngày; mặc định UI là 7 ngày.
5. Gửi đường dẫn portal cho người dùng qua kênh đã được QTS phê duyệt. Hệ thống hiện chưa tự gửi email.
6. Ở lần đăng nhập Google đầu tiên, backend khớp email lời mời, kiểm tra `email_verified`, tạo membership theo `iss + sub` và đánh dấu lời mời `ACCEPTED`.
7. Những lần sau backend chỉ định danh bằng `iss + sub`, không dùng email làm ID.
8. Lời mời `PENDING` có thể được thu hồi; thao tác yêu cầu optimistic version, đúng tenant/workspace và được ghi audit.

`qts_admin` có thể mời role client và internal. `client_admin` chỉ có thể mời/quản lý `client_admin`, `client_viewer`, `billing`, `technical` trong tenant của mình.

Khi đổi role hoặc chuyển trạng thái thành `DISABLED`, backend thu hồi session hiện có của membership đó. Người dùng phải đăng nhập lại để nhận quyền mới; tài khoản disabled bị từ chối.

## 13. Hướng dẫn vận hành nghiệp vụ

### 13.1. Khởi tạo khách hàng

1. Đăng nhập bằng `qts_admin` hoặc `account_manager`.
2. Mở **Khách hàng** > **Thêm khách hàng**.
3. Nhập tenant ID ổn định, tên doanh nghiệp, gói dịch vụ và liên hệ khẩn cấp.
4. Cấu hình SLA Critical/High/Medium/Low theo phút.
5. Chọn tenant ở thanh trên cùng trước khi tạo tài sản, license, ticket, tài liệu hoặc lời mời.

Tenant ID không nên đổi sau khi đi vào vận hành. Dashboard/ticket chỉ có deadline SLA khi tenant đã cấu hình ngưỡng tương ứng.

### 13.2. Quản lý cảnh báo

1. SOC chọn tenant, mở **Cảnh báo** và tạo record từ sự kiện đã được xác minh.
2. Điền source, external reference, severity, mô tả, tài sản và thời điểm phát hiện.
3. Chuyển trạng thái theo quy trình tiếp nhận/xử lý.
4. Dashboard tổng hợp trực tiếp các record này và làm mới mỗi 30 giây.

UI/API hiện hỗ trợ nhập và quản lý cảnh báo, chưa có daemon tự nhận log từ SIEM. Không dùng tài khoản người dùng/session cookie làm service credential cho automation; cần thiết kế service-to-service auth trước khi nối ingestion production.

### 13.3. Ticket và incident

1. Khách hàng hoặc nhân viên có quyền chọn **Tạo ticket**.
2. Chọn tenant (internal), loại, severity, tiêu đề và mô tả.
3. Frontend gửi `Idempotency-Key` riêng để tránh tạo trùng khi retry.
4. SOC cập nhật status, severity, assignee bằng optimistic version.
5. Dùng comment `CUSTOMER` để trao đổi chung; comment `INTERNAL` chỉ dành cho nhân viên QTS.
6. Theo dõi `dueAt` và trạng thái vi phạm SLA trên dashboard/danh sách.

Nếu hai người sửa cùng phiên bản, API trả conflict; tải lại record rồi áp dụng thay đổi trên phiên bản mới.

### 13.4. Tài sản và license

1. Tạo inventory tài sản với loại, vendor, identifier, criticality, owner và health.
2. Cập nhật `lastSeenAt` từ quy trình vận hành đáng tin cậy.
3. Tạo license với sản phẩm, vendor, số lượng, thời gian hiệu lực và trạng thái.
4. Dashboard tính sức khỏe tài sản và license sắp hết hạn từ dữ liệu đã lưu.

### 13.5. Hợp đồng và hóa đơn

1. Account manager/QTS admin tạo hợp đồng theo tenant, số hợp đồng, thời hạn và giá trị.
2. Tạo hóa đơn, kỳ hạn, đơn vị tiền tệ, số tiền và trạng thái.
3. Cập nhật trạng thái sau khi đối soát ở hệ thống tài chính chính thức.

Module hiện là sổ quản lý nghiệp vụ; chưa kết nối cổng thanh toán hoặc phần mềm kế toán và không tự xử lý giao dịch tiền.

### 13.6. Tài liệu và knowledge base

1. Nhân viên có quyền chọn tenant và tải PDF, TXT hoặc Markdown tối đa 10 MiB.
2. Backend xác minh media type/nội dung cơ bản, tính SHA-256 và lưu tài liệu.
3. Download luôn đi qua authorization check và được ghi audit.
4. Soạn knowledge article, chọn audience `CLIENT`, `INTERNAL` hoặc `ALL`, sau đó chuyển `PUBLISHED` khi đã duyệt.

Production phải bổ sung object storage, malware scanning/CDR, retention và DLP; kiểm tra hiện tại không thay thế antivirus.

### 13.7. Tích hợp và ca trực

1. Tạo integration với loại SIEM/SOAR/EDR/Webhook, endpoint HTTPS và secret tối thiểu 16 ký tự.
2. Backend mã hóa secret bằng AES-256-GCM; response/UI không trả lại plaintext.
3. Không đặt credential trong endpoint URL.
4. Lập ca SOC với kỹ sư, level, thời gian bắt đầu/kết thúc và ghi chú bàn giao.

Integration record hiện là inventory/cấu hình bảo mật, chưa tự gọi endpoint hay đồng bộ dữ liệu.

### 13.8. Audit và điều tra

1. Mở **Audit log** và lọc theo tenant, action, outcome hoặc resource.
2. Dùng request ID để đối chiếu giữa response, log gateway và audit record.
3. Bảng audit có trigger chặn `UPDATE`/`DELETE` để giữ append-only ở application database.
4. Hạn chế quyền truy cập audit vì có thể chứa định danh và metadata vận hành.

Audit database không thay thế hệ thống lưu trữ bất biến/WORM độc lập. Production nên xuất audit sang SIEM/log archive có retention và kiểm soát truy cập riêng.

## 14. API và quy ước gọi

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/api/v1/health`, `/api/v1/ready` | Liveness và database readiness |
| `GET` | `/api/v1/auth/status` | Trạng thái cấu hình Google OIDC |
| `GET` | `/api/v1/auth/login/google` | Bắt đầu OIDC Authorization Code Flow |
| `GET` | `/api/v1/auth/callback/google` | Callback backend |
| `GET` | `/api/v1/auth/session` | Lấy user, role, tenant, workspace và CSRF token |
| `POST` | `/api/v1/auth/logout` | Thu hồi session |
| `POST` | `/api/v1/contact-requests` | Tiếp nhận yêu cầu tư vấn công khai từ trang công ty |
| `GET` | `/api/v1/portal/overview` | Dashboard tổng hợp |
| `GET`, `POST` | `/api/v1/portal/{resource}` | Danh sách/tạo `alerts`, `tickets`, `assets`, `licenses`, `tenants`, `contracts`, `invoices`, `documents`, `knowledge`, `integrations`, `shifts` |
| `PATCH` | `/api/v1/portal/{resource}/{id}` | Cập nhật resource hỗ trợ; documents không patch |
| `GET`, `POST` | `/api/v1/portal/tickets/{id}/comments` | Đọc/thêm trao đổi ticket |
| `GET` | `/api/v1/portal/documents/{id}/download` | Tải tài liệu sau authorization |
| `GET`, `PATCH` | `/api/v1/portal/members[/{id}]` | Liệt kê/cập nhật thành viên |
| `GET`, `POST` | `/api/v1/portal/invitations` | Liệt kê/tạo lời mời |
| `PATCH` | `/api/v1/portal/invitations/{id}` | Thu hồi lời mời `PENDING` bằng optimistic version |
| `GET` | `/api/v1/portal/audit` | Tra cứu audit |

Endpoint contact công khai không yêu cầu session, được validate phía server và giới hạn 5 lần trong 10 phút theo địa chỉ nguồn. Yêu cầu mới chỉ xuất hiện trong dashboard Internal Portal của `account_manager` và `qts_admin`. Tất cả portal API yêu cầu session cookie. Mutation portal yêu cầu thêm header `X-CSRF-Token`; tạo ticket yêu cầu `Idempotency-Key` dài 8–128 ký tự. List endpoint hỗ trợ `page`, `pageSize` tối đa 100, `search`, `sortBy`, `sortOrder`, `tenantId` và filter theo resource.

Error envelope thống nhất:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Yêu cầu không hợp lệ.",
    "details": {}
  }
}
```

Xem hợp đồng chi tiết tại [docs/api/openapi.yaml](docs/api/openapi.yaml).

## 15. Lệnh phát triển và kiểm thử

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev:frontend` | Next dev server có Fast Refresh và rewrite `/api/*` |
| `npm run dev:backend:env` | Backend watch mode, đọc `backend/.env` |
| `npm run start:backend:env` | Backend không watch, đọc `backend/.env` |
| `npm run db:migrate:env --workspace @qts/backend` | Áp dụng migration chưa chạy |
| `npm run db:rollback:env --workspace @qts/backend` | Lùi đúng một migration; chỉ dùng khi đã đánh giá dữ liệu |
| `npm run test:frontend` | Frontend tests |
| `npm run test:backend` | Backend unit/HTTP tests |
| `npm run test:integration:env --workspace @qts/backend` | PostgreSQL integration test |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint frontend và syntax check backend |
| `npm run build` | Production frontend bundle và backend validation |
| `npm run check` | Typecheck, lint, toàn bộ unit tests và build |
| `npm audit --audit-level=moderate` | Dependency advisory gate |

Integration test tạo schema/database test riêng theo cơ chế của test rồi dọn sau khi hoàn tất; không trỏ test vào database production.

## 16. Runbook hệ thống

### 16.1. Khởi động mỗi ngày

```powershell
docker compose --env-file backend/.env up -d database
npm run dev:backend:env
```

Ở terminal khác:

```powershell
npm run dev:frontend
```

Xác nhận `/health`, `/ready`, `/auth/status`, sau đó smoke test đăng nhập và một route đúng role.

### 16.2. Dừng local an toàn

Dừng process Node bằng `Ctrl+C`, sau đó:

```powershell
docker compose --env-file backend/.env stop database
```

Không dùng `docker compose down -v` trừ khi chủ đích xóa toàn bộ dữ liệu local trong volume.

### 16.3. Backup PostgreSQL local

```powershell
New-Item -ItemType Directory -Force .\backups
$qtsDatabaseContainer = docker compose --env-file backend/.env ps -q database
docker exec $qtsDatabaseContainer pg_dump -U qts -d qts_portal --format=custom --file=/tmp/qts_portal.dump
docker cp "${qtsDatabaseContainer}:/tmp/qts_portal.dump" .\backups\qts_portal.dump
```

Thử restore vào database riêng, không ghi đè database đang vận hành:

```powershell
docker exec $qtsDatabaseContainer createdb -U qts qts_portal_restore
docker cp .\backups\qts_portal.dump "${qtsDatabaseContainer}:/tmp/qts_portal_restore.dump"
docker exec $qtsDatabaseContainer pg_restore -U qts -d qts_portal_restore --clean --if-exists /tmp/qts_portal_restore.dump
```

Production phải dùng backup mã hóa, PITR, retention, restore drill và RPO/RTO do QTS phê duyệt.

### 16.4. Thu hồi tài khoản

1. Vào **Thành viên**, chuyển `status` thành `DISABLED` và lưu.
2. Backend thu hồi session của người dùng.
3. Kiểm tra audit `members.update` và thử đăng nhập lại.
4. Nếu tài khoản nằm trong `QTS_AUTH_MEMBERSHIPS_JSON`, xóa entry đó; nếu không, lần restart kế tiếp sẽ bootstrap lại quyền.
5. Đồng thời vô hiệu hóa tài khoản/2-Step Verification tại Google Workspace khi sự cố yêu cầu.

### 16.5. Xoay secret

- **Google Client Secret**: tạo secret mới, cập nhật secret manager trên tất cả instance, rolling restart/smoke test, sau đó mới thu hồi secret cũ.
- **Database credential**: rotate ở PostgreSQL và secret manager theo một change window; cập nhật pool connection, restart và kiểm tra readiness.
- **`QTS_DATA_ENCRYPTION_KEY`**: không thay trực tiếp khi còn integration secret đã mã hóa. Phải có quy trình giải mã bằng khóa cũ, mã hóa lại bằng khóa mới, kiểm chứng rồi mới thu hồi khóa cũ. Repository chưa cung cấp job rotation tự động.

### 16.6. Theo dõi

- Cảnh báo khi readiness `503`, tỷ lệ `5xx/401/403/429`, latency hoặc restart tăng bất thường.
- Thu thập stdout lifecycle event và reverse-proxy access log nhưng không log cookie, authorization code, token, CSRF hoặc request body nhạy cảm.
- Theo dõi PostgreSQL connection, disk, slow query, backup và replication lag ở production.
- Theo dõi audit outcome `DENIED`/`FAILURE`, role change, account disable và document download.

## 17. Giới hạn và việc cần làm trước production

- Chưa có connector worker/queue để tự ingest SIEM, SOAR, EDR hoặc telemetry khối lượng lớn.
- Dashboard dùng polling 30 giây; chưa có WebSocket/SSE và freshness SLO.
- Integration module chỉ lưu cấu hình; chưa gọi webhook hay kiểm tra health tự động.
- Hóa đơn/hợp đồng chưa kết nối payment gateway, ERP hoặc approval hai người.
- Lời mời không tự gửi email; QTS phải thông báo qua kênh đã kiểm soát.
- Tài liệu hiện lưu trong PostgreSQL, tối đa 10 MiB và chưa có antivirus/CDR/DLP/object storage.
- Chưa có SAML SSO; provider hiện tại là Google OIDC.
- MFA phải được cưỡng chế tại Google Workspace; portal chưa có step-up authentication cho thao tác đặc quyền.
- Audit append-only trong cùng database chưa phải WORM/archive độc lập.
- Compose chỉ dành cho local; production cần managed PostgreSQL HA, TLS, backup/PITR và network policy.
- Chưa có Elasticsearch; cần đánh giá riêng khi log/search vượt khả năng PostgreSQL.
- Cần bổ sung service-to-service authentication trước khi cho hệ thống bên ngoài ghi cảnh báo/tài sản.
- Cần CI secret scan, SAST/SCA/IaC/DAST, load test, accessibility regression, pentest và diễn tập khôi phục trước go-live.

## 18. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| `MEMBERSHIP_NOT_FOUND` | Google account hợp lệ nhưng chưa có membership/lời mời | Lấy `iss + sub` từ audit để bootstrap tài khoản đầu tiên hoặc tạo lời mời qua portal |
| `INVALID_AUTH_TRANSACTION` | Trộn `localhost`/`127.0.0.1`, cookie cũ, callback lặp lại hoặc transaction hết hạn | Dùng duy nhất `http://127.0.0.1:3000`, xóa cookie site local và bắt đầu login mới |
| Google `redirect_uri_mismatch` | Redirect URI trên Google không khớp tuyệt đối | Đặt đúng `http://127.0.0.1:3000/api/v1/auth/callback/google` và `QTS_PUBLIC_ORIGIN` |
| Auth báo chưa cấu hình | Thiếu Client ID, Client Secret hoặc memberships JSON | Kiểm tra đủ ba biến; mảng `[]` là hợp lệ |
| Backend không khởi động vì database | Container chưa ready, password/URL lệch hoặc port bị chiếm | Kiểm tra `docker compose ... ps`, log database và hai giá trị password |
| `QTS_DATA_ENCRYPTION_KEY must decode...` | Khóa không phải Base64 32 byte | Sinh lại bằng lệnh Node ở phần setup; không dùng chuỗi tùy ý |
| `CSRF_INVALID`/`403` khi mutation | Session cũ hoặc thiếu `X-CSRF-Token` | Tải lại session/đăng nhập lại; API client phải gửi CSRF hiện tại |
| `VERSION_CONFLICT`/`409` | Record đã được người khác cập nhật | Reload record và gửi lại `expectedVersion` mới |
| Dashboard toàn số `0` | Database chưa có dữ liệu trong scope | Đây là kết quả thực, không phải lỗi hay dummy data; nhập/integrate dữ liệu hợp lệ |
| `/ready` trả `503` | PostgreSQL không truy cập được | Kiểm tra connection, pool, TLS/CA và sức khỏe database |

## 19. Quy tắc bảo mật bắt buộc

- Không commit `.env`, secret, token, database dump hoặc dữ liệu khách hàng.
- Không đưa Google token/session vào `localStorage` hoặc `sessionStorage`.
- Không dùng email làm primary identity; luôn dùng `iss + sub` sau provisioning.
- Không tin role/tenant do browser gửi; backend lấy từ session/membership.
- Không thêm dummy data hoặc fallback local khi API lỗi.
- Không mở CORS wildcard cho credentialed API; frontend và `/api` nên cùng public origin.
- Production bắt buộc HTTPS, cookie `Secure`, HSTS, WAF/rate limit và secret manager.
- Mọi thay đổi schema phải có migration, test integration và kế hoạch rollback/backup.

Tài liệu chi tiết theo workspace: [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md). Các quyết định kiến trúc nằm trong [docs/decisions](docs/decisions), hợp đồng API tại [docs/api/openapi.yaml](docs/api/openapi.yaml).
