# ADR-005: PostgreSQL persistence và tenant isolation

## Trạng thái

Accepted - 2026-08-03.

ADR này thay thế các nhận định triển khai tạm thời trong ADR-001/ADR-002 rằng portal chỉ có placeholder và session nằm trong bộ nhớ. Những ADR trước vẫn được giữ như lịch sử quyết định của baseline.

## Bối cảnh

Google OIDC gateway ban đầu dùng store trong process và chưa có API nghiệp vụ. Cách đó không đáp ứng restart, nhiều instance, audit, tenant isolation hoặc dữ liệu thật cho Client/Internal Portal.

Portal cần một nguồn dữ liệu quan hệ đáng tin cậy cho identity, session, ticket/SLA, inventory, billing và audit. Tenant boundary phải được kiểm soát ở backend và có thêm lớp bảo vệ tại database.

## Quyết định

1. Dùng PostgreSQL 17 làm persistence chính cho identity, OIDC transaction, session và domain record.
2. Mọi repository operation chạy trong transaction, hạ quyền bằng `SET LOCAL ROLE qts_app`, rồi cài `qts.tenant_id` và `qts.internal_access` bằng `set_config(..., true)`.
3. Bật Row-Level Security trên bảng tenant-scoped; client không thể chọn cross-tenant scope.
4. Permission và tenant scope vẫn được kiểm tra ở service trước khi truy vấn. RLS là defense in depth, không phải kiểm soát duy nhất.
5. Session/OIDC transaction lưu opaque ID dưới dạng hash và có TTL.
6. Audit event là append-only bằng trigger chặn update/delete.
7. Mutation update dùng optimistic version; ticket create dùng idempotency key.
8. Integration secret mã hóa AES-256-GCM trước khi ghi database và không trả lại qua API.
9. Migration SQL có file up/down, bảng lịch sử và advisory lock; backend áp dụng migration trước khi listen.
10. Local dùng PostgreSQL Docker Compose; production phải dùng topology HA/TLS/backup do QTS phê duyệt.
11. Production tách credential migration owner khỏi runtime. Runtime bắt buộc là role `qts_app` không có `SUPERUSER` hoặc `BYPASSRLS`; backend fail-fast nếu sai role hoặc thiếu migration URL.

## Hệ quả tích cực

- Restart backend không làm mất session hoặc nghiệp vụ.
- Có thể chạy nhiều backend instance dùng chung session store.
- Tenant policy có thể kiểm thử ở cả application và database.
- Dashboard và UI chỉ hiển thị kết quả truy vấn thực.
- Audit/mutation có transaction semantics và khả năng điều tra tốt hơn.

## Đánh đổi

- PostgreSQL trở thành dependency bắt buộc cho readiness và local setup.
- Migration/backup/restore/key rotation cần runbook và change control.
- Lưu document trong PostgreSQL chỉ phù hợp baseline; production cần object storage và malware scanning.
- Audit cùng database chưa đạt tính bất biến của WORM archive độc lập.
- RLS phụ thuộc mọi transaction đặt đúng scope; integration tests phải ngăn hồi quy.
- Release pipeline phải quản lý hai database credential và cấp `LOGIN` cho `qts_app` qua secret manager/DBA runbook.

## Kiểm chứng

- Unit/HTTP tests cho policy, validation, auth/session và route.
- Integration tests PostgreSQL cho migration, RLS chéo tenant, idempotency và append-only audit.
- Browser smoke tests xác minh workspace/tenant selector không dùng dữ liệu fallback.
