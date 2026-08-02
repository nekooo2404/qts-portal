# ADR-004: Google OpenID Connect và session phía backend

- Trạng thái: Accepted
- Ngày: 2026-08-03

## Bối cảnh

QTS Portal cần một hệ thống đăng nhập chung cho Client Portal và Internal Portal, nhưng quyền truy cập phải được phân tách theo tenant và role. Frontend không được giữ Google token hoặc client secret. Email có thể thay đổi nên không phù hợp làm định danh ổn định.

## Quyết định

1. Dùng Google OpenID Connect với OAuth Client loại Web application.
2. Dùng Authorization Code Flow với scope `openid email profile`, `state`, `nonce` và PKCE S256.
3. Callback public `/api/v1/auth/callback/google` luôn được xử lý bởi backend.
4. Dùng `openid-client` cho discovery, authorization URL, code exchange, JWKS và ID token validation.
5. Backend kiểm tra thêm `iss`, `aud`, `exp`, `nonce`, `email_verified` và `hd` nếu QTS giới hạn Google Workspace.
6. Dùng cặp `iss + sub` làm khóa membership; email chỉ dùng để hiển thị/đối chiếu audit.
7. Membership ánh xạ tới `tenantId`, `role`, `workspace` và được nạp từ biến môi trường ở giai đoạn hiện tại.
8. Backend phát opaque session ID bằng cookie HttpOnly. Google token bị loại bỏ sau callback.
9. Logout yêu cầu CSRF token gắn với session.
10. Transaction và session hiện dùng store TTL trong RAM, chỉ phù hợp development hoặc một replica.

## Hệ quả

- Frontend không thể đọc hoặc làm rò rỉ Google token qua Web Storage.
- Việc đổi email không đổi identity của người dùng.
- `hd` được kiểm tra như claim đã ký; kiểm tra suffix email bị cấm.
- Danh sách membership rỗng cho phép thu thập identity đã xác minh qua audit nhưng không cấp session.
- Restart process thu hồi toàn bộ session và giao dịch đang chờ.
- Production HA cần thay store RAM bằng shared store có TTL và kiểm soát mã hóa.
- Thay đổi membership chỉ có hiệu lực sau restart và session mới.
- Google ID token không cung cấp claim đủ để ứng dụng chứng minh từng lần đăng nhập đã qua MFA; QTS phải cưỡng chế 2-Step Verification bằng chính sách Google Workspace.

## Phương án bị loại

- Implicit Flow hoặc token trong browser: tăng bề mặt rò rỉ và không cần thiết cho portal này.
- Dùng email làm user ID: email có thể thay đổi hoặc được cấp lại.
- Chỉ kiểm tra đuôi email: không chứng minh tài khoản thuộc Workspace.
- Tự viết xác minh JWT/JWKS: tăng rủi ro sai giao thức và vòng đời khóa.
- Cookie chứa Google ID token: làm token tồn tại lâu hơn và mở rộng blast radius.

## Tài liệu nguồn

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google: Verify the ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Google OAuth 2.0 Web Server](https://developers.google.com/identity/protocols/oauth2/web-server)
- [openid-client](https://github.com/panva/openid-client)
