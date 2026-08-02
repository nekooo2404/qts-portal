# QTS Portal Frontend

Frontend React/Vite hiển thị website QTS, cổng Google OIDC và trạng thái truy cập Client/Internal Portal. Frontend không xử lý authorization code, không nhận Google token và không lưu session trong Web Storage.

## Phạm vi

| Chức năng | Trạng thái |
| --- | --- |
| Website công ty | Hoạt động tại `/company` |
| Auth status | Đọc từ `/api/v1/auth/status` |
| Google login | Điều hướng browser tới endpoint backend |
| Session | Đọc từ `/api/v1/auth/session` bằng cookie cùng origin |
| Client route guard | Kiểm tra `workspace=client` để điều chỉnh UX |
| Internal route guard | Kiểm tra `workspace=internal` để điều chỉnh UX |
| Logout | POST CSRF token do backend cấp |
| Dữ liệu nghiệp vụ | Không có dữ liệu cục bộ hoặc fallback giả |

Route guard frontend không phải ranh giới bảo mật. Mọi API nghiệp vụ tương lai vẫn phải xác thực session, tenant và permission ở backend.

## Cấu trúc auth

```text
src/auth/
|-- AuthContext.tsx  # Tải auth status/session và thực hiện logout
|-- auth-context.ts  # Context và useAuth hook
`-- types.ts         # Session, workspace và role contract
```

`AuthProvider` có năm trạng thái rõ ràng:

- `loading`: đang kiểm tra backend.
- `unconfigured`: Google OIDC chưa được cấu hình.
- `anonymous`: OIDC sẵn sàng nhưng chưa có session.
- `authenticated`: có session QTS hợp lệ.
- `error`: không xác minh được; giao diện fail closed.

## Chạy frontend

Từ thư mục gốc:

```powershell
npm ci
npm run dev:frontend
```

Mở `http://localhost:5173/` khi callback Google được cấu hình với origin này.

Vite proxy `/api/*` tới `http://127.0.0.1:8080`. Đổi backend origin:

```powershell
$env:QTS_API_ORIGIN = "http://127.0.0.1:8081"
npm run dev:frontend
```

`QTS_API_ORIGIN` chỉ được đọc bởi Vite dev server. Không dùng biến `VITE_*` cho secret vì giá trị có thể được đưa vào browser bundle.

## Route

| Route | Không cấu hình | Chưa đăng nhập | Đúng workspace | Sai workspace |
| --- | --- | --- | --- | --- |
| `/` | Nút bị khóa | Nút Google hoạt động | Link tới workspace | Link tới workspace |
| `/client/*` | Unavailable | Yêu cầu login | Trạng thái Client đã xác thực | Forbidden |
| `/admin/*` | Unavailable | Yêu cầu login | Trạng thái Internal đã xác thực | Forbidden |
| `/company` | Website công khai | Website công khai | Website công khai | Website công khai |

Không có bảng, KPI, alert, ticket, asset hoặc billing record được hiển thị cho đến khi có API thật.

## Luồng browser

1. Gọi status và session với `credentials: same-origin`.
2. Nút login là navigation tới `/api/v1/auth/login/google`; không dùng AJAX để xử lý redirect.
3. Sau callback, backend redirect về đúng workspace.
4. Frontend render display name, tenant, role và workspace từ session response.
5. Logout gửi `X-CSRF-Token`; cookie HttpOnly tự đi theo request và JavaScript không thể đọc.
6. Response `401` đưa UI về trạng thái anonymous; lỗi khác đưa UI về fail-closed.

## Kiểm thử và build

```powershell
npm run test:frontend
npm run typecheck
npm run lint:frontend
npm run build:frontend
```

Test auth UI xác nhận:

- Không có field mật khẩu hoặc OTP cục bộ.
- Nút Google chỉ hoạt động khi backend báo configured.
- Client session không mở Internal Portal.
- Tenant/role chỉ đến từ session response.
- Logout gửi đúng CSRF token.
- Không có bảng dữ liệu dựng sẵn ở workspace.

## Production

1. Build bằng `npm run build:frontend`.
2. Phục vụ `frontend/dist/` qua CDN/static host; không dùng `vite preview` làm production server.
3. Rewrite route SPA về `index.html`.
4. Reverse proxy `/api/*` tới backend dưới cùng public origin.
5. Bắt buộc HTTPS và áp dụng security headers tương đương `public/_headers`.
6. Cache asset có hash dài hạn; revalidate HTML entrypoint.
7. Smoke test `/`, `/company`, `/client/overview`, `/admin/soc` trên desktop/mobile.
8. Kiểm tra Console, Network, keyboard focus, reduced motion và text overflow.

## Quy tắc dữ liệu và bảo mật

- Không thêm user, tenant, telemetry hoặc record nghiệp vụ vào source.
- Không dùng localStorage/sessionStorage cho token hoặc session.
- Không thêm form password/OTP thay thế Google OIDC.
- Không tin role/tenant do route hoặc browser tự chọn.
- Không fallback sang dữ liệu cục bộ khi API lỗi.
- Không gửi `GOOGLE_CLIENT_SECRET` hay biến backend vào frontend.
- Không dùng `dangerouslySetInnerHTML` cho dữ liệu API.
- Luôn có loading, anonymous, forbidden, empty và error state riêng khi mở domain nghiệp vụ.
