# ADR-001: Ranh giới frontend prototype và routing nội bộ

## Trạng thái

Superseded by the Next.js App Router migration on 2026-08-04, ADR-003 and ADR-004

## Ngày

2026-07-31

## Ghi chú thay thế

ADR-003 thay thế các quyết định về dữ liệu nghiệp vụ và phân quyền cục bộ. ADR-004 thay thế quyết định session trong React memory bằng Google OIDC và session cookie phía backend. Next.js App Router thay thế History API, Vite entry và SPA fallback; tài liệu này chỉ còn giá trị lịch sử.

## Bối cảnh

Repository ban đầu là website React/Vite tĩnh, không có backend, IdP hoặc database. Yêu cầu mới cần một Auth Gateway, Client Portal và Internal Portal với URL riêng, RBAC, ticket/incident mutation và audit để kiểm chứng sản phẩm.

Portal thuộc lĩnh vực bảo mật nên không được mô tả frontend demo như một hệ thống IAM/SOC production. Trong lúc triển khai, `npm audit` phát hiện advisory mức cao trên các phiên bản React Router khả dụng. Tập route của prototype nhỏ, đóng và không cần data router, server action hoặc SSR routing.

## Quyết định

1. Giữ ứng dụng là static React/Vite frontend.
2. Dùng History API nội bộ với path pattern đóng và `useSyncExternalStore` để đồng bộ URL.
3. Dùng `frontend/public/_redirects` để static host fallback mọi route về `index.html`.
4. Lưu session, ticket, incident và audit phát sinh trong React memory; không dùng browser storage.
5. Kiểm tra role/permission tại route, navigation và mutation function của context.
6. Lazy-load Client Portal, Internal Portal và chunk biểu đồ.
7. Gắn nhãn Demo cho mọi dữ liệu và vô hiệu hóa action cần backend thật như payment, file download và key rotation.

## Các phương án đã cân nhắc

### React Router

- Ưu điểm: API routing phổ biến, nested route và ecosystem tốt.
- Nhược điểm: các phiên bản khả dụng tại thời điểm triển khai có advisory được dependency audit phát hiện; nhu cầu prototype không cần phần lớn API.
- Kết luận: loại dependency để giữ audit sạch và giảm attack/dependency surface.

### Next.js

- Ưu điểm: routing, SSR và server boundary tích hợp.
- Nhược điểm: thay đổi toàn bộ kiến trúc repository, không tạo ra backend IAM/SOC production chỉ bằng việc đổi framework.
- Kết luận: không phù hợp phạm vi prototype frontend hiện tại.

### Lưu session trong localStorage

- Ưu điểm: refresh không mất phiên.
- Nhược điểm: dễ tạo kỳ vọng sai về auth persistence và là vị trí không phù hợp cho bearer token production.
- Kết luận: dùng memory-only session và công khai hành vi mất phiên khi refresh.

## Hệ quả

- Dependency audit không còn advisory ở thời điểm quyết định.
- Route layer nhỏ và đủ cho tập path hiện tại, nhưng không thay thế framework routing nếu sản phẩm sau này cần nested data loading phức tạp.
- Refresh route con cần rewrite từ static host.
- Người đánh giá phải đăng nhập lại sau refresh.
- Production backend vẫn phải thực thi authentication, tenant isolation và authorization trên từng request.
- Khi chọn framework/router production, đội ngũ phải chạy lại dependency/security review và ghi ADR mới thay thế quyết định này.
