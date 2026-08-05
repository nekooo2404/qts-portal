# QTS One Frontend

Frontend Next.js App Router cung cấp website QTS, cổng Google OIDC và hai workspace Client/Internal. Mọi số liệu nghiệp vụ được tải từ backend thật; frontend không có seed/fallback operational data.

Hướng dẫn setup và vận hành đầy đủ nằm tại [README gốc](../README.md).

## Trách nhiệm

- Hiển thị auth state: loading, unconfigured, anonymous, authenticated, forbidden và unavailable.
- Điều hướng browser tới backend để bắt đầu Google login; không xử lý authorization code.
- Đọc session bằng cookie cùng origin; không lưu token/session trong Web Storage.
- Render menu theo workspace/role để tối ưu UX.
- Gọi portal API với CSRF token cho mutation.
- Hiển thị loading, empty, error và permission-denied riêng biệt.
- Không tự tạo KPI, alert, ticket, asset hoặc record thay thế khi API lỗi/rỗng.

Frontend guard không phải ranh giới bảo mật. Backend vẫn xác thực session, permission và tenant trên từng request.

## Cấu trúc

```text
frontend/src/
|-- app/                     # Route, metadata, sitemap và static params
|-- components/portal/       # Shell, navigation link, status, feedback
|-- components/marketing/    # Shell, form, search và khối marketing dùng chung
|-- portal/                  # API client, permission, config và hooks
|-- screens/                 # Website, auth gateway và workspace nghiệp vụ
|-- portal.css               # Portal workspace responsive styles
`-- styles.css               # Website/auth global styles
```

## Route

| Nhóm | Route |
| --- | --- |
| Public | `/`, `/gioi-thieu`, `/dich-vu/*`, `/giai-phap/*`, `/du-an/*`, `/tin-tuc/*`, `/lien-he` |
| Client | `/portal/overview`, alerts, tickets, assets, licenses, contracts, invoices, documents, knowledge, team, audit |
| Internal | `/admin/soc`, alerts, tickets, customers, assets, licenses, contracts, invoices, documents, knowledge, integrations, team, shifts, audit |

Route sai workspace hiển thị forbidden. Route không có trong navigation của role hiển thị access denied; API backend vẫn là kiểm soát cuối cùng.

Các route cũ `/ve-qts`, `/khach-hang`, `/tai-nguyen`, `/bang-gia`, `/ho-tro` và `/company` chỉ tồn tại để chuyển hướng tương thích sang cấu trúc public mới.

## Chạy frontend

```powershell
npm ci
npm run dev:frontend
```

Mở `http://127.0.0.1:3000`. Next dev server rewrite `/api/*` tới `http://127.0.0.1:8080`.

Đổi backend dev origin nếu cần:

```powershell
$env:QTS_API_ORIGIN = "http://127.0.0.1:8081"
npm run dev:frontend
```

`QTS_API_ORIGIN` chỉ được Next dev server đọc. Không đặt secret trong biến `NEXT_PUBLIC_*` vì biến đó được đưa vào browser bundle.

## Dữ liệu và mutation

- Form liên hệ gửi `POST /api/v1/contact-requests`; yêu cầu thành công xuất hiện trên dashboard Internal Portal.
- Dashboard tải `/api/v1/portal/overview` và tự làm mới 30 giây.
- Resource list dùng server pagination/search; UI hiện lấy tối đa 100 bản ghi mỗi trang làm việc.
- Ticket create sinh UUID làm `Idempotency-Key`.
- Update gửi `expectedVersion` để phát hiện ghi đè đồng thời.
- Document tối đa 10 MiB, định dạng PDF/TXT/Markdown, truyền Base64 tới backend.
- Download dùng blob URL ngắn hạn và filename từ response.
- Team invitation chỉ provisioning; UI không tuyên bố đã gửi email.

## Kiểm thử và build

```powershell
npm run test:frontend
npm run typecheck
npm run lint:frontend
npm run build:frontend
npm run preview
```

`npm run preview` phục vụ static export `frontend/out/` tại `http://127.0.0.1:4173` để smoke test bản build; không dùng server này cho production.

Test bao phủ IAM fail-closed, workspace isolation, CSRF logout, admin intake, empty state và ticket mutation có CSRF/idempotency.

## Production frontend

1. Đặt `NEXT_PUBLIC_SITE_URL` thành HTTPS origin chính thức trước khi build để canonical URL, Open Graph, JSON-LD và sitemap không dùng domain minh họa.
2. Chạy `npm run build:frontend`.
3. Phục vụ `frontend/out/` qua CDN/static host; mỗi route có `index.html` riêng nhờ `trailingSlash`.
4. Reverse proxy `/api/*` tới backend dưới cùng public origin.
5. Bắt buộc HTTPS và áp dụng security headers trong `public/_headers`.
6. Cache `/_next/static/*` immutable; HTML phải revalidate.
7. Smoke test public/client/internal trên desktop và mobile.

Static export cần `script-src 'unsafe-inline'` cho bootstrap RSC của Next. Khi chuyển sang server rendering, thay bằng CSP nonce theo từng response để loại bỏ ngoại lệ này.

## Quy tắc bắt buộc

- Không thêm credential form hoặc local auth bypass.
- Không dùng `localStorage`/`sessionStorage` cho token hay session.
- Không tin tenant/role từ route hoặc form; backend phải quyết định.
- Không fallback sang dữ liệu local/dummy khi API lỗi.
- Không dùng `dangerouslySetInnerHTML` cho dữ liệu API.
- Không gửi backend secret vào bundle.
- Mọi module phải giữ đủ loading, empty, error và denied state.
