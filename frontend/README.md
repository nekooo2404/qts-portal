# QTS Portal Frontend

Frontend React/Vite của QTS Portal. Ứng dụng hiện cung cấp website công ty, cổng đăng nhập ở trạng thái chờ tích hợp và các trang khóa cho Client Portal/Internal Portal.

> Frontend không chứa tài khoản, phiên đăng nhập, số liệu SOC, ticket, sự cố, tài sản, hợp đồng, hóa đơn hoặc audit event cục bộ. Route nghiệp vụ chỉ được mở sau khi IAM và API thật được tích hợp.

## 1. Phạm vi hiện tại

| Chức năng | Trạng thái |
| --- | --- |
| Website công ty QTS | Hoạt động tại `/company` |
| Cổng đăng nhập | Hiển thị yêu cầu tích hợp IAM; không nhận credential |
| Client Portal | Giữ route nhưng hiển thị trạng thái chưa khả dụng |
| Internal Portal | Giữ route nhưng hiển thị trạng thái chưa khả dụng |
| Dữ liệu nghiệp vụ | Không được nhúng trong frontend |
| Xác thực và phân quyền | Chưa tích hợp; không có cơ chế bỏ qua cục bộ |

## 2. Yêu cầu môi trường

- Node.js 22 LTS hoặc phiên bản tương thích với `package.json`.
- npm đi kèm Node.js.
- Backend QTS chạy riêng nếu cần kiểm tra `/api/*`.

Khuyến nghị luôn cài dependency từ thư mục gốc để dùng đúng npm workspace và lockfile:

```powershell
cd D:\hoapuiii\Code\qts-portal
npm ci
```

## 3. Chạy frontend

```powershell
npm run dev:frontend
```

Mặc định truy cập `http://127.0.0.1:5173/`.

Đổi cổng khi cần:

```powershell
npm run dev:frontend -- --port 5174
```

Các URL kiểm tra nhanh:

| URL | Kết quả mong đợi |
| --- | --- |
| `http://127.0.0.1:5173/` | Cổng đăng nhập chưa khả dụng |
| `http://127.0.0.1:5173/company` | Website công ty QTS |
| `http://127.0.0.1:5173/client/overview` | Client Portal bị khóa |
| `http://127.0.0.1:5173/admin/soc` | Internal Portal bị khóa |

## 4. Công nghệ

| Hạng mục | Công nghệ |
| --- | --- |
| UI | React 19, React DOM 19 |
| Ngôn ngữ | TypeScript strict |
| Dev/build | Vite 7, target ES2022 |
| Icon | Lucide React |
| Style | CSS thuần và design token ba tầng |
| Unit/component test | Vitest, Testing Library, user-event, JSDOM |
| Browser QA | Playwright |

Thư viện biểu đồ đã được loại khỏi dependency vì chưa có nguồn telemetry thật. Khi API số liệu được phê duyệt, thư viện trực quan hóa chỉ nên được thêm cùng contract, empty state, loading state, error state và kiểm thử tương ứng.

## 5. Cấu trúc frontend

```text
frontend/
|-- public/                       # Logo, static headers và SPA fallback
|-- src/
|   |-- components/               # Thành phần website và cổng truy cập
|   |   `-- portal/
|   |       |-- AuthGateway.tsx   # Trạng thái chờ IAM
|   |       `-- PortalLink.tsx    # Điều hướng History API
|   |-- lib/                      # Logic contact, navigation và search
|   |-- pages/
|   |   `-- MarketingPortal.tsx   # Website công ty
|   |-- App.tsx                   # Route công khai và route khóa
|   |-- portal.css                # Style cho cổng truy cập
|   `-- styles.css                # Style website công ty
|-- tokens.css                    # Primitive, semantic và component token
|-- vite.config.ts                # Vite, Vitest và API proxy
`-- package.json
```

## 6. Kết nối backend

Trong development, request tới `/api/*` được Vite proxy tới `http://127.0.0.1:8080`.

Đổi origin backend:

```powershell
$env:QTS_API_ORIGIN = "http://127.0.0.1:8081"
npm run dev:frontend
```

`QTS_API_ORIGIN` chỉ cấu hình dev server. Không đưa secret vào biến có tiền tố `VITE_` vì giá trị đó có thể xuất hiện trong bundle trình duyệt. Production nên phục vụ frontend và reverse proxy `/api` trên cùng origin.

Backend hiện chỉ công bố:

- `GET /api/v1/health`
- `GET /api/v1/ready`

Frontend không tự tạo số liệu khi endpoint nghiệp vụ không tồn tại, trả lỗi hoặc trả danh sách rỗng.

## 7. Chính sách dữ liệu và xác thực

1. Không nhúng record nghiệp vụ, người dùng, tenant, credential, OTP, token hoặc API key vào source code.
2. Không lưu access token trong `localStorage` hoặc `sessionStorage`.
3. Không dùng route guard phía client làm ranh giới bảo mật.
4. Không tự chuyển sang dữ liệu cục bộ khi API mất kết nối.
5. Mọi request nghiệp vụ tương lai phải đi qua API được version hóa, có xác thực, kiểm tra tenant và authorization phía server.
6. Loading, empty, unavailable và error là các trạng thái riêng; không thay thế chúng bằng số liệu giả.
7. Nội dung giới thiệu dịch vụ QTS là nội dung biên tập công khai, không phải dữ liệu vận hành.

## 8. Điều kiện để mở Client Portal/Internal Portal

Trước khi thay trạng thái khóa bằng giao diện nghiệp vụ, phải hoàn tất tối thiểu:

1. Chọn IdP và giao thức OIDC hoặc SAML.
2. Bật MFA theo chính sách QTS; ưu tiên WebAuthn hoặc TOTP.
3. Thiết kế session bằng cookie `HttpOnly`, `Secure`, `SameSite` phù hợp.
4. Chốt mô hình tenant và role matrix.
5. Backend kiểm tra authentication, tenant isolation và permission trên mọi endpoint.
6. Công bố OpenAPI cho từng domain được mở.
7. Có database/migration, audit append-only và chiến lược retention.
8. Có test chống truy cập chéo tenant và test quyền theo role.
9. Có observability, rate limit, CSP, WAF và quy trình quản lý secret.

Không thêm form mật khẩu hoặc nút SSO hoạt động trước khi có endpoint IAM thật.

## 9. Kiểm thử và build

Chạy từ thư mục gốc:

```powershell
npm run test:frontend
npm run typecheck
npm run lint:frontend
npm run build:frontend
```

Chạy toàn bộ quality gate của repository:

```powershell
npm run check
```

Build tạo artifact tại `frontend/dist/`. Kiểm tra artifact production:

```powershell
npm run preview
```

Static host phải rewrite route SPA về `index.html`, giữ asset có hash với cache dài hạn, triển khai security header tương đương `public/_headers` và bắt buộc HTTPS.

## 10. Vận hành

Sau mỗi lần triển khai frontend:

1. Xác nhận `/company` render đúng logo và nội dung.
2. Xác nhận `/`, `/client/*`, `/admin/*` không hiển thị form credential hay dữ liệu nghiệp vụ khi IAM chưa được cấu hình.
3. Gọi `/api/v1/health` và `/api/v1/ready` qua reverse proxy.
4. Kiểm tra browser console, request lỗi, CSP violation và asset 404.
5. Kiểm tra ở viewport mobile và desktop, keyboard focus và reduced motion.
6. Rollback artifact nếu route công khai lỗi hoặc route bị khóa vô tình lộ nội dung nghiệp vụ.

Không sửa trực tiếp `frontend/dist/`; mọi thay đổi phải đi qua source, kiểm thử và build lại.
