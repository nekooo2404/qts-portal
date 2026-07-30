# Kế hoạch triển khai QTS Workspace

## 1. Mục tiêu kế hoạch

Phát triển QTS Portal từ baseline không có dữ liệu vận hành thành hệ thống production theo từng lát dọc có thể kiểm chứng. Không mở giao diện nghiệp vụ trước khi IAM, tenant isolation và API tương ứng sẵn sàng.

## 2. Trạng thái hiện tại

| Hạng mục | Trạng thái | Kết quả |
| --- | --- | --- |
| Tách frontend/backend | Hoàn tất | Hai npm workspace, lệnh chạy và build độc lập |
| Website công ty | Hoàn tất | Hoạt động tại `/company` |
| Backend hạ tầng | Hoàn tất | Health, readiness, OpenAPI, timeout và graceful shutdown |
| Loại bỏ dữ liệu cục bộ | Hoàn tất | Không còn record nghiệp vụ, tài khoản, phiên hoặc mutation trong frontend |
| Trạng thái route khóa | Hoàn tất | Client/Internal Portal không hiển thị dữ liệu khi IAM/API chưa có |
| IAM production | Chưa triển khai | Cần quyết định IdP, MFA, session và recovery |
| API nghiệp vụ | Chưa triển khai | Cần domain contract, database và policy tenant |
| Client Portal | Chưa triển khai | Chỉ bắt đầu sau IAM và API domain đầu tiên |
| Internal Portal | Chưa triển khai | Chỉ bắt đầu sau IAM, quyền nội bộ và audit |

## 3. Nguyên tắc thực hiện

1. Backend contract và policy có trước giao diện sử dụng dữ liệu.
2. Mỗi lát dọc phải có authentication, authorization, tenant isolation, audit và observability phù hợp.
3. Không dùng dữ liệu cục bộ làm fallback khi API chưa sẵn sàng hoặc gặp lỗi.
4. Mỗi endpoint có loading, empty, error và permission-denied state riêng.
5. Mỗi checkpoint phải giữ `npm run check` đạt và có thể rollback độc lập.
6. Chỉ tuyên bố chức năng hoạt động khi luồng browser gọi backend thật và dữ liệu được lưu đúng nguồn.

## 4. Pha 0 - Baseline sạch

### Công việc đã hoàn tất

- Xóa module record nghiệp vụ và type chỉ phục vụ dữ liệu cục bộ.
- Xóa tài khoản/persona, credential, MFA, SSO và session cục bộ.
- Xóa ticket/incident/audit mutation trong bộ nhớ.
- Xóa dashboard, bảng, biểu đồ và dependency trực quan hóa không còn nguồn dữ liệu.
- Giữ `/client/*` và `/admin/*` ở trạng thái khóa rõ ràng.
- Bổ sung test ngăn hồi quy: không có form credential, bảng hoặc số liệu trên route khóa.
- Cập nhật README, đặc tả và ADR.

### Cổng chất lượng

```powershell
npm run check
npm audit --audit-level=moderate
```

## 5. Pha 1 - IAM và tenant foundation

### Công việc

1. Chọn IdP và ghi ADR cho OIDC/SAML, MFA, recovery và logout.
2. Thiết kế tenant, membership, role, permission và privileged access.
3. Tạo backend session exchange bằng cookie an toàn; không đưa bearer token vào browser storage.
4. Thêm middleware authentication, authorization, tenant context và correlation ID.
5. Tạo audit append-only cho login, logout, failure, role change và session revoke.
6. Tích hợp cổng truy cập thật; route client/admin chỉ mở sau khi server xác nhận quyền.

### Tiêu chí chấp nhận

- Không có local bypass hoặc development credential trong bundle.
- Test thành công/thất bại cho login, logout, expiry, revoke và MFA requirement.
- Test chéo tenant và role trái quyền luôn bị backend từ chối.
- Cookie và security header được kiểm tra trên HTTPS staging.
- Runbook account disable và emergency access được diễn tập.

## 6. Pha 2 - Nền tảng dữ liệu và audit

### Công việc

1. Chọn PostgreSQL topology, migration framework và backup policy.
2. Tạo domain nền: tenant, user mapping, permission, asset reference và audit metadata.
3. Định nghĩa OpenAPI, validation, pagination và error taxonomy.
4. Bổ sung structured logging, metric, tracing và alert.
5. Thiết lập secret manager, KMS và policy truy cập dữ liệu.

### Tiêu chí chấp nhận

- Migration tiến/lùi được kiểm thử.
- Backup/restore đạt RPO/RTO đã phê duyệt.
- API không tin tenant/role do client gửi lên.
- Log không chứa credential, token, secret hoặc payload nhạy cảm ngoài chính sách.
- Truy vấn và index luôn mang tenant constraint bắt buộc.

## 7. Pha 3 - Client Portal theo lát dọc

Thứ tự đề xuất:

1. Tài sản/dịch vụ và health summary.
2. Ticket và SLA.
3. Cảnh báo và threat dashboard.
4. Tài liệu compliance/report.
5. Hợp đồng, license và billing.
6. Audit dành cho tenant.

Mỗi lát dọc gồm OpenAPI, persistence, permission, UI, loading/empty/error state, audit, observability, test và runbook. Dashboard realtime chỉ triển khai sau khi ingestion contract và freshness semantics được duyệt.

### Tiêu chí chấp nhận

- Khách hàng chỉ thấy dữ liệu thuộc tenant và entitlement của họ.
- Empty state không tạo số liệu thay thế.
- Ticket mutation có idempotency, audit và SLA clock phía server.
- File/report dùng access check và signed URL ngắn hạn.
- Billing action có approval và đối soát theo quy trình chính thức.

## 8. Pha 4 - Internal Portal theo lát dọc

Thứ tự đề xuất:

1. Danh sách tenant và SOC queue theo quyền.
2. Incident dispatch, escalation và shift handover.
3. Hồ sơ khách hàng và liên hệ khẩn cấp.
4. Integration inventory và health.
5. Thay đổi cấu hình có approval.
6. Audit và forensic export.

### Tiêu chí chấp nhận

- Quyền đa tenant là explicit grant, không suy ra từ UI.
- Thao tác đặc quyền yêu cầu step-up authentication hoặc dual control theo risk policy.
- Incident update có optimistic concurrency/idempotency và immutable audit.
- Secret chỉ tồn tại trong vault; UI không nhận lại secret đầy đủ.
- Ca trực, escalation và cảnh báo được kiểm thử với quy trình SOC thực tế.

## 9. Pha 5 - Hardening và go-live

### Công việc

- WAF/DDoS protection, rate limit và network segmentation.
- TLS, CSP, HSTS, key rotation và dependency governance.
- Secret scan, SAST, SCA, IaC scan và DAST trong CI/CD.
- Load/capacity test cho API và telemetry ingestion.
- Penetration test độc lập, xử lý finding và retest.
- Disaster recovery, backup restore và incident response drill.
- Dashboard vận hành, alert ownership và on-call runbook.
- Canary/blue-green deployment và rollback đã diễn tập.

### Cổng go-live

- Không còn finding critical/high chưa được chấp nhận bằng quy trình risk chính thức.
- RTO/RPO, capacity, retention và data residency được QTS phê duyệt.
- Audit, alert, backup, restore, rollback và emergency access đã được diễn tập.
- Tài liệu vận hành và ownership có người chịu trách nhiệm cụ thể.

## 10. Rủi ro và kiểm soát

| Rủi ro | Mức độ | Kiểm soát |
| --- | --- | --- |
| Giao diện bị hiểu là chức năng đã hoạt động | Cao | Route khóa và tài liệu trạng thái rõ ràng |
| Frontend guard bị coi là authorization | Cao | Enforce ở API và tầng truy vấn; test trái quyền |
| Rò rỉ chéo tenant | Rất cao | Tenant context từ session, policy bắt buộc, security test |
| API mất kết nối nhưng UI hiện số liệu cũ/cục bộ | Cao | Không có fallback; hiển thị unavailable/error |
| Secret lọt vào bundle hoặc log | Rất cao | Secret manager, scan CI, log redaction |
| Telemetry quá tải | Cao | Backpressure, queue, rate limit, capacity test |
| Route SPA lỗi khi refresh | Trung bình | Static fallback/reverse proxy và smoke test sau deploy |

## 11. Definition of done cho mỗi lát dọc

- Contract và threat model được review.
- Authentication, authorization và tenant isolation có test.
- Không có dữ liệu cục bộ thay cho backend.
- UI có đầy đủ loading, empty, error, denied và unavailable state.
- Audit và observability đủ để điều tra vận hành.
- Unit, integration, browser, typecheck, lint, build và audit dependency đạt.
- Security review và tài liệu runbook hoàn tất.
- Rollback được xác định và kiểm thử ở môi trường phù hợp.
