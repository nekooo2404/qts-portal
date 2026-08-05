# ADR-002: Tách frontend và backend bằng npm workspaces

## Trạng thái

Superseded in part by ADR-004 and the Next.js App Router migration on 2026-08-04

Các quyết định về npm workspaces, ranh giới frontend/backend và same-origin API vẫn còn hiệu lực. ADR-004 thay thế trạng thái backend không có runtime dependency và quyết định trì hoãn IAM; Next.js development rewrite thay thế Vite proxy.

## Ngày

2026-07-31

## Bối cảnh

Repository ban đầu đặt toàn bộ React/Vite ở thư mục gốc. QTS Portal cần ranh giới triển khai rõ giữa giao diện và API, nhưng frontend hiện vẫn là prototype fixture và chưa có mô hình dữ liệu hoặc IdP production đã được phê duyệt.

Môi trường thực hiện có Node.js và npm nhưng không có Go toolchain. Việc tạo các endpoint nghiệp vụ giả sẽ làm người vận hành hiểu sai mức độ hoàn thiện và tạo contract không dựa trên mô hình tenant/IAM chính thức.

## Quyết định

1. Dùng npm workspaces với hai package `@qts/frontend` và `@qts/backend`, một lockfile tại repository root.
2. Chuyển toàn bộ React/Vite, static asset, test và build config vào `frontend/` mà không thay đổi hành vi sản phẩm.
3. Tạo backend Node.js không có runtime dependency, chỉ cung cấp endpoint hạ tầng versioned `/api/v1/health` và `/api/v1/ready`.
4. Định nghĩa contract tại `docs/api/openapi.yaml` và kiểm thử backend qua HTTP thật bằng Node.js test runner.
5. Frontend gọi đường dẫn cùng origin `/api`; Vite proxy tới backend trong development. Production dùng reverse proxy thay cho CORS wildcard.
6. Chưa thêm IAM, ticket, billing, telemetry hoặc persistence cho tới khi QTS phê duyệt IdP, tenant model, role matrix và data model.
7. Giữ API contract độc lập với runtime để backend có thể tiếp tục bằng Node.js hoặc di chuyển sang Go/NestJS sau một ADR thay thế.

## Hệ quả

- Frontend và backend có thể chạy, kiểm thử, build và triển khai độc lập.
- Một lệnh ở repository root có thể chạy quality gate cho cả hai package.
- Backend hiện có lifecycle và probe đủ để tích hợp hạ tầng, nhưng không phải backend nghiệp vụ.
- Không có CORS trong development vì frontend proxy request; topology gần với production same-origin hơn.
- Khi thêm database hoặc IdP, readiness, threat model, deployment manifest và runbook phải được cập nhật.
- Go vẫn là một lựa chọn cho backend production, nhưng cần toolchain, benchmark và ADR riêng trước khi migration.
