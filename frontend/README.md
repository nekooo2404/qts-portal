# QTS Portal Frontend

Frontend React/Vite cung cấp website QTS, cổng Google OIDC và hai workspace Client/Internal. Mọi số liệu nghiệp vụ được tải từ backend thật; frontend không có seed/fallback operational data.

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
|-- auth/                    # AuthContext, hook và contract
|-- components/portal/       # Shell, navigation link, status, feedback
|-- pages/portal/            # Dashboard và từng module nghiệp vụ
|-- portal/                  # API client, permission, config và hooks
|-- App.tsx                  # Route/auth gateway
|-- portal.css               # Portal workspace responsive styles
`-- styles.css               # Website/auth global styles
```

## Route

| Nhóm | Route |
| --- | --- |
| Public | `/`, `/company` |
| Client | `/client/overview`, alerts, tickets, assets, licenses, contracts, invoices, documents, knowledge, team, audit |
| Internal | `/admin/soc`, alerts, tickets, customers, assets, licenses, contracts, invoices, documents, knowledge, integrations, team, shifts, audit |

Route sai workspace hiển thị forbidden. Route không có trong navigation của role hiển thị access denied; API backend vẫn là kiểm soát cuối cùng.

## Chạy frontend

```powershell
npm ci
npm run dev:frontend
```

Mở `http://localhost:5173`. Vite proxy `/api/*` tới `http://127.0.0.1:8080`.

Đổi backend dev origin nếu cần:

```powershell
$env:QTS_API_ORIGIN = "http://127.0.0.1:8081"
npm run dev:frontend
```

`QTS_API_ORIGIN` chỉ được Vite dev server đọc. Không đặt secret trong `VITE_*` vì biến đó có thể bị đưa vào browser bundle.

## Dữ liệu và mutation

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
```

Test bao phủ auth gateway, workspace isolation, CSRF logout, dashboard response thật, empty state và ticket mutation có idempotency.

## Production frontend

1. Chạy `npm run build:frontend`.
2. Phục vụ `frontend/dist/` qua CDN/static host; không dùng `vite preview` làm production server.
3. Rewrite SPA route về `index.html`.
4. Reverse proxy `/api/*` tới backend dưới cùng public origin.
5. Bắt buộc HTTPS và security headers tương đương `public/_headers`.
6. Cache asset có hash dài hạn; HTML entrypoint phải revalidate.
7. Smoke test public/client/internal trên desktop và mobile.

## Quy tắc bắt buộc

- Không thêm credential form hoặc local auth bypass.
- Không dùng `localStorage`/`sessionStorage` cho token hay session.
- Không tin tenant/role từ route hoặc form; backend phải quyết định.
- Không fallback sang dữ liệu local/dummy khi API lỗi.
- Không dùng `dangerouslySetInnerHTML` cho dữ liệu API.
- Không gửi backend secret vào bundle.
- Mọi module phải giữ đủ loading, empty, error và denied state.
