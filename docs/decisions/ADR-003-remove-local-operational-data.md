# ADR-003: Loại bỏ dữ liệu vận hành và xác thực cục bộ

## Trạng thái

Accepted. Điều khoản History API/SPA fallback đã được thay thế bởi Next.js App Router.

## Ngày

2026-07-31

## Bối cảnh

Frontend từng chứa record nghiệp vụ, tài khoản/persona, luồng credential/MFA/SSO và state mutation trong bộ nhớ để minh họa Client Portal/Internal Portal. Cách này tạo nguy cơ người dùng hiểu nhầm rằng IAM, RBAC, SOC telemetry, ticket, incident và audit đã được tích hợp thật.

QTS Portal thuộc lĩnh vực an ninh mạng. Khi chưa có IdP, tenant model, backend nghiệp vụ và nguồn dữ liệu được phê duyệt, giao diện không được tạo ra số liệu hoặc hành vi thay thế có vẻ như đang vận hành.

## Quyết định

1. Xóa toàn bộ record vận hành cục bộ gồm user, tenant, alert, telemetry, ticket, incident, asset, license, billing, document, integration và audit event.
2. Xóa credential, OTP, persona, session trong bộ nhớ, MFA và SSO thay thế.
3. Xóa mutation cục bộ cho ticket, incident, assignment và audit.
4. Giữ `/client/*` và `/admin/*` nhưng chỉ render trạng thái chưa khả dụng cho tới khi IAM và API thật tồn tại.
5. Frontend không sinh dữ liệu fallback khi API thiếu, lỗi hoặc trả danh sách rỗng.
6. Giữ nội dung biên tập công khai tại `/company` vì đây không phải dữ liệu vận hành.
7. Xóa dependency biểu đồ cho tới khi có metric contract, source và semantics được phê duyệt.
8. Bổ sung test xác nhận cổng truy cập không có form credential và route khóa không có bảng dữ liệu.
9. Mọi domain tương lai phải được triển khai theo lát dọc gồm contract, persistence, IAM, authorization, tenant isolation, audit, observability và test.

## Phạm vi thay thế

ADR này thay thế ADR-001 mục 4, 5 và 7 cùng các giả định runtime tương ứng trong đặc tả/kế hoạch cũ. ADR-001 vẫn có giá trị lịch sử; quyết định History API và SPA fallback đã được thay thế bởi Next.js App Router theo cập nhật ngày 2026-08-05. ADR-002 về ranh giới frontend/backend vẫn còn hiệu lực.

## Các phương án đã cân nhắc

### Giữ dữ liệu cục bộ nhưng gắn nhãn

- Ưu điểm: giao diện có nhiều màn hình để trình diễn.
- Nhược điểm: vẫn có nguy cơ bị hiểu là dữ liệu thật, che khuất trạng thái tích hợp và làm tăng mã phải duy trì.
- Kết luận: không đáp ứng yêu cầu loại bỏ toàn bộ dữ liệu dựng sẵn.

### Giữ tài khoản nội bộ chỉ cho development

- Ưu điểm: thuận tiện mở route trong quá trình phát triển.
- Nhược điểm: tạo đường bỏ qua IAM, dễ lọt vào bundle hoặc môi trường staging/production.
- Kết luận: không chấp nhận; test phải render component trực tiếp hoặc dùng IAM test environment chính thức.

### Xóa hoàn toàn route client/admin

- Ưu điểm: surface nhỏ nhất.
- Nhược điểm: làm mất URL contract và không truyền đạt rõ lý do portal chưa mở.
- Kết luận: giữ route với trạng thái khóa, không kèm dữ liệu.

## Hệ quả

- UI không còn trình diễn dashboard hoặc workflow nghiệp vụ khi chưa có backend.
- Không có cơ chế đăng nhập cục bộ để truy cập portal.
- Bundle nhỏ hơn và dependency surface giảm do loại bỏ code biểu đồ/workspace.
- Trạng thái sản phẩm được thể hiện trung thực; lỗi kết nối không bị che bởi dữ liệu fallback.
- Việc mở lại từng chức năng đòi hỏi contract và security boundary thật, làm tăng chi phí đầu vào nhưng giảm rủi ro sai kiến trúc và hiểu nhầm mức độ sẵn sàng.
- Test và tài liệu phải ngăn việc tái đưa record vận hành hoặc local auth vào source code.
