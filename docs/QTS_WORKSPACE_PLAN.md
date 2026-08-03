# Kế hoạch hoàn thiện và go-live QTS Portal

## 1. Baseline đã hoàn tất

| Lát triển khai | Kết quả |
| --- | --- |
| Tách frontend/backend | Hai npm workspace, build/test độc lập, cùng một lockfile |
| Loại dummy data | Không còn user/tenant/telemetry/record dựng sẵn hoặc fallback local |
| Google OIDC | Backend code flow, state, nonce, PKCE, claim validation, Workspace `hd` |
| IAM bền vững | PostgreSQL transaction/session, membership, invitation, revoke khi đổi quyền |
| Data foundation | Migration, domain tables, RLS, audit append-only, encryption key |
| API domain | Dashboard, tenant, alert, ticket, asset, license, billing, document, knowledge, integration, shift, member, audit |
| Client Portal | Đã nối API thật cho toàn bộ route client |
| Internal Portal | Đã nối API thật và tenant selector cho toàn bộ route internal |
| Responsive UX | Desktop/mobile, empty/loading/error/denied states, no-overflow 320 px |
| Tài liệu | README setup/runbook, workspace spec, OpenAPI và ADR |

## 2. Cổng chất lượng ứng dụng

Mỗi thay đổi trước merge phải chạy:

```powershell
npm run check
npm run test:integration:env --workspace @qts/backend
npm audit --audit-level=moderate
```

Với thay đổi UI/auth/domain flow phải bổ sung browser smoke test ở desktop và mobile, kiểm tra console/network và xác nhận không có dữ liệu giả.

## 3. Pha A - Hạ tầng staging

1. Chọn managed PostgreSQL cùng vùng dữ liệu được QTS phê duyệt.
2. Bật PostgreSQL TLS, private networking, HA, PITR và encrypted backup.
3. Lưu Google secret, database credential và data encryption key trong secret manager/KMS.
4. Deploy frontend static/CDN và backend container dưới cùng HTTPS origin.
5. Cấu hình reverse proxy, HSTS, CSP, WAF/DDoS và rate limit.
6. Thu thập metric, structured log và audit vào nền tảng quan sát tập trung.
7. Chạy migration bằng release job có lock, credential owner riêng và kiểm soát rollback; runtime chỉ dùng role `qts_app` không đặc quyền.

Tiêu chí ra khỏi pha:

- Restore backup thành công trong môi trường tách biệt.
- Login, session cookie, CSRF và tenant isolation smoke test đạt trên HTTPS.
- Không secret nào xuất hiện trong image, bundle, log hoặc repository.
- Alert vận hành có owner và on-call route.

## 4. Pha B - Tích hợp nghiệp vụ bên ngoài

### Security ingestion

- Định nghĩa service-to-service identity, scope và key rotation.
- Thêm queue/backpressure, deduplication và dead-letter handling.
- Xây connector SIEM/EDR/SOAR theo contract riêng.
- Định nghĩa event freshness, ordering và replay semantics.
- Capacity/load test theo lưu lượng log dự kiến.

### Billing/CRM

- Xác định hệ thống nguồn cho contract/invoice/payment status.
- Thêm webhook signature, reconciliation và idempotency.
- Thiết kế approval/dual control cho mutation tài chính.
- Không để portal trở thành nguồn thanh toán nếu chưa được phê duyệt.

### Notification

- Tích hợp email provider qua queue.
- Template lời mời không chứa credential/token nhạy cảm.
- Theo dõi bounce/delivery và chống enumeration.

Tiêu chí ra khỏi pha:

- Connector có authentication, audit, retry và runbook.
- Không dùng session cookie người dùng cho machine ingestion.
- Dữ liệu source-of-truth và ownership được ký duyệt.

## 5. Pha C - File, key và audit hardening

1. Chuyển document binary sang object storage private.
2. Thêm antivirus/CDR, DLP, signed download ngắn hạn và retention.
3. Xây job re-encrypt để xoay `QTS_DATA_ENCRYPTION_KEY` không mất secret.
4. Đẩy audit sang archive bất biến/WORM và SIEM.
5. Định nghĩa retention/purge hợp pháp cho từng domain, trừ audit bắt buộc giữ.
6. Thêm step-up authentication/dual control cho thao tác đặc quyền cao.

Tiêu chí ra khỏi pha:

- Key rotation và restore file được diễn tập.
- Malware test file bị chặn và có alert.
- Audit có thể truy nguyên actor/request/resource giữa portal và SIEM.

## 6. Pha D - Security assurance và go-live

1. Secret scan, SAST, SCA, IaC scan trong CI.
2. DAST staging và dependency/container policy gate.
3. Load/capacity/soak test API, database và ingestion.
4. Accessibility regression và browser matrix.
5. Pentest độc lập theo OWASP ASVS/Top 10 và retest finding.
6. Disaster recovery, rollback, account compromise và incident-response drill.
7. Privacy/data residency/retention review.
8. Runbook và ownership sign-off bởi SOC, Engineering, IT, Finance và Security.

Go-live chỉ khi:

- Không còn Critical/High finding chưa xử lý hoặc chưa có risk acceptance chính thức.
- RPO/RTO, SLO, capacity và retention được phê duyệt.
- Backup restore, rollback, key rotation, account disable và emergency access đã diễn tập.
- WAF, alert, on-call, dashboard vận hành và escalation hoạt động.
- Google Workspace MFA policy đã được xác minh ở cấp tổ chức.

## 7. Rủi ro đang mở

| Rủi ro | Mức độ | Kiểm soát tạm thời |
| --- | --- | --- |
| Integration mới chỉ là inventory | Cao | Không quảng bá là đã ingest; nhập record qua quy trình kiểm soát |
| Document chưa quét malware | Rất cao | Chỉ user đặc quyền upload, giới hạn loại/kích thước; chưa mở production |
| Encryption key chưa có rotation job | Cao | Giữ khóa trong secret manager, backup và change control nghiêm ngặt |
| Audit cùng database | Cao | Hạn chế DB privilege; ưu tiên WORM export trước go-live |
| Billing chưa đối soát tự động | Cao | Hệ thống tài chính chính thức vẫn là source-of-truth |
| Invitation chưa gửi email tự động | Trung bình | Thông báo qua kênh QTS đã xác minh |
| Dashboard polling 30 giây | Trung bình | Hiển thị generated time; chưa cam kết realtime SLO |

## 8. Definition of done cho lát mới

- Contract/threat model được review.
- Authentication, authorization, tenant isolation và audit có test.
- Không có dummy/fallback data.
- UI có loading, empty, error, denied và responsive state.
- Observability đủ chẩn đoán mà không log secret/token.
- Unit, integration, browser, typecheck, lint, build và dependency audit đạt.
- Migration có backup/rollback plan.
- Runbook, ownership và giới hạn được cập nhật trước khi merge.
