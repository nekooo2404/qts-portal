# QTS Portal Backend

Backend Node.js chịu trách nhiệm toàn bộ Google OpenID Connect, ánh xạ tenant/role, session cookie, CSRF và API hạ tầng. Frontend không sở hữu credential hoặc token Google.

## Phạm vi

- Health và readiness.
- Google Authorization Code Flow với `openid email profile`.
- `state`, `nonce` và PKCE S256 mới cho từng lần đăng nhập.
- Callback `/api/v1/auth/callback/google`.
- Xác minh ID token bằng `openid-client` và JWKS của Google.
- Kiểm tra lại `iss`, `aud`, `exp`, `nonce`, `email_verified`, `hd`.
- Membership allowlist dùng cặp `issuer + subject`.
- Opaque session ID trong cookie HttpOnly.
- CSRF token cho logout.
- Auth audit event dạng JSON trên stdout.

Backend chưa có API SOC/ticket/asset/billing, database, shared session store hoặc audit store bền vững.

## Cấu trúc

```text
backend/
|-- .env.example
|-- src/
|   |-- app.js           # HTTP routing, cookie parsing, error response, rate limit
|   |-- auth-config.js   # Env validation, role/workspace và membership
|   |-- auth-service.js  # Transaction, claims, session và CSRF
|   |-- auth-store.js    # Store TTL trong RAM
|   |-- google-oidc.js   # Adapter openid-client
|   `-- server.js        # Process lifecycle và wiring
`-- test/                # Config, HTTP, service, OIDC adapter và probe tests
```

## Chạy backend

Không đọc file `.env`:

```powershell
npm run dev:backend
```

Đọc `backend/.env`:

```powershell
npm run dev:backend:env
```

Chế độ không watch:

```powershell
npm run start:backend
npm run start:backend:env
```

Mặc định backend lắng nghe tại `http://127.0.0.1:8080`.

## Biến môi trường

| Biến | Mặc định | Validation |
| --- | --- | --- |
| `QTS_API_HOST` | `127.0.0.1` | Host backend |
| `QTS_API_PORT` | `8080` | Số nguyên `1..65535` |
| `QTS_TRUST_PROXY_HOPS` | `0` | `0..10`; số reverse proxy tin cậy trước backend |
| `QTS_PUBLIC_ORIGIN` | `http://127.0.0.1:5173` | Origin tuyệt đối, không path/query/hash; HTTPS ở production |
| `QTS_AUTH_COOKIE_SECURE` | Theo protocol origin | Production bắt buộc `true` |
| `GOOGLE_CLIENT_ID` | Không có | Bắt buộc khi bật auth |
| `GOOGLE_CLIENT_SECRET` | Không có | Bắt buộc; chỉ backend được đọc |
| `GOOGLE_OIDC_ISSUER` | `https://accounts.google.com` | Không cho đổi sang issuer khác |
| `GOOGLE_WORKSPACE_DOMAIN` | Không giới hạn | Nếu có, claim `hd` phải khớp |
| `QTS_AUTH_MEMBERSHIPS_JSON` | Không có | Mảng JSON, có thể là `[]` để bootstrap fail-closed |
| `QTS_AUTH_TRANSACTION_TTL_SECONDS` | `600` | `120..900` |
| `QTS_SESSION_TTL_SECONDS` | `28800` | `900..86400` |

Nếu không có bất kỳ cấu hình Google nào, auth ở trạng thái disabled. Nếu chỉ có một phần cấu hình, process từ chối khởi động.

Membership schema:

```json
[
  {
    "issuer": "https://accounts.google.com",
    "subject": "google-sub-da-xac-minh",
    "tenantId": "tenant-do-qts-quan-ly",
    "role": "soc_l1"
  }
]
```

Không thêm `email` vào membership. Parser từ chối field ngoài `issuer`, `subject`, `tenantId`, `role` để tránh vô tình dùng email làm ID.

## Endpoint

| Method | Path | Thành công | Lỗi chính |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | `200` | `405` |
| `GET` | `/api/v1/ready` | `200` | `503`, `405` |
| `GET` | `/api/v1/auth/status` | `200` | `405` |
| `GET` | `/api/v1/auth/login/google` | `302` | `400`, `429`, `503` |
| `GET` | `/api/v1/auth/callback/google` | `303` | `400`, `401`, `403`, `503` |
| `GET` | `/api/v1/auth/session` | `200` | `401` |
| `POST` | `/api/v1/auth/logout` | `204` | `401`, `403` |

Error envelope:

```json
{
  "error": {
    "code": "MEMBERSHIP_NOT_FOUND",
    "message": "Tài khoản chưa được cấp tenant và role trên QTS Portal."
  }
}
```

Contract đầy đủ: [OpenAPI](../docs/api/openapi.yaml).

## Cookie

Production session cookie:

- Tên `__Host-qts_session`.
- `Path=/` và không có `Domain`.
- `HttpOnly`, `Secure`, `SameSite=Lax`, `Priority=High`.
- Giá trị là random opaque ID 256 bit; không phải Google token hay JWT chứa claims.

Transaction cookie dùng tên `__Secure-qts_oidc_tx`, chỉ áp dụng cho callback path và hết hạn sau tối đa 15 phút. Local HTTP dùng tên không có secure prefix và chỉ được phép ngoài production.

## Audit auth

Các event hiện có:

- `auth_membership_not_found`: issuer, subject và email đã xác minh để provisioning.
- `auth_login_succeeded`: issuer, subject, tenant và role.
- `auth_logout_succeeded`: issuer, subject, tenant và role.
- Lifecycle: `api_started`, `api_shutdown_started`, `api_shutdown_complete`.

Không event nào chứa authorization code, Google token, client secret, session ID hoặc CSRF token. Stdout vẫn chứa dữ liệu định danh; chỉ hệ thống log được ủy quyền mới được đọc.

## Kiểm thử

```powershell
npm run test:backend
npm run lint:backend
npm run build:backend
```

Test bao phủ:

- Cấu hình disabled/partial/production HTTPS.
- Role hợp lệ và cấm mapping bằng email.
- State, nonce, PKCE S256 và scope.
- Callback một lần, claim validation và hosted domain.
- Mapping `iss + sub` và từ chối account chưa cấp quyền.
- Session cookie không chứa Google token/subject.
- CSRF logout, cookie parsing, redirect và rate limit.
- Health/readiness/security headers/404/405.

## Vận hành

1. Cấp secret qua secret manager; không bake vào image.
2. Chạy quality gate trước deploy.
3. Chạy backend sau reverse proxy có TLS và WAF.
4. Chỉ proxy `/api/*`; không bật CORS wildcard.
5. Theo dõi auth event, `4xx/5xx`, latency và restart.
6. Gửi `SIGTERM` khi deploy và chờ shutdown hoàn tất.
7. Bảo vệ stdout log như dữ liệu định danh.
8. Dùng shared session/transaction store trước khi chạy nhiều replica.

Rate limiter mặc định dùng địa chỉ kết nối trực tiếp. Khi backend chỉ có thể được gọi qua một chuỗi reverse proxy đã kiểm soát, đặt `QTS_TRUST_PROXY_HOPS` đúng số hop để lấy IP từ phía phải của `X-Forwarded-For`. Cấu hình sai có thể cho phép giả mạo IP hoặc gom mọi người dùng vào một bucket. Reverse proxy/WAF vẫn phải áp dụng rate limit chính theo IP client.

## Giới hạn

- Store trong RAM mất dữ liệu khi restart.
- Membership chỉ nạp lúc process start.
- Không có endpoint revoke một session riêng lẻ.
- Readiness chưa kiểm tra Google hay shared dependency.
- Chưa có authorization middleware cho API nghiệp vụ vì các API đó chưa tồn tại.

Không triển khai nhiều replica hoặc mở dữ liệu khách hàng cho đến khi các giới hạn này được xử lý.
