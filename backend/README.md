# QTS Portal Backend

Backend HTTP chạy độc lập cho QTS Operations Portal. Phiên bản hiện tại là nền tảng hạ tầng có health/readiness, response JSON nhất quán, timeout và graceful shutdown.

> Backend chưa có IAM, MFA/SSO, RBAC server-side, tenant storage, ticket, billing, telemetry, audit hoặc tích hợp SIEM/SOAR/EDR. Không triển khai production dựa trên hai endpoint hạ tầng này như thể hệ thống nghiệp vụ đã hoàn chỉnh.

## Chạy backend

Từ thư mục gốc:

```powershell
cd D:\hoapuiii\Code\qts-portal
npm ci
npm run dev:backend
```

Chế độ không watch:

```powershell
npm run start:backend
```

Backend mặc định lắng nghe tại `http://127.0.0.1:8080`.

## Cấu hình

| Biến | Mặc định | Quy tắc |
| --- | --- | --- |
| `QTS_API_HOST` | `127.0.0.1` | Địa chỉ lắng nghe; chỉ mở ra mạng khi có kiểm soát firewall/reverse proxy |
| `QTS_API_PORT` | `8080` | Số nguyên từ `1` đến `65535` |

Ví dụ:

```powershell
$env:QTS_API_HOST = "127.0.0.1"
$env:QTS_API_PORT = "8081"
npm run start:backend
```

Ứng dụng không tự đọc file `.env`. Nền tảng triển khai phải cấp biến môi trường qua process manager, container hoặc secret manager phù hợp.

## Endpoint

| Method | Path | Quyền | Mục đích | Thành công |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Công khai | Liveness: tiến trình HTTP đang hoạt động | `200` |
| `GET` | `/api/v1/ready` | Công khai | Readiness: tiến trình sẵn sàng nhận lưu lượng | `200` |

Health response:

```json
{
  "data": {
    "service": "qts-portal-api",
    "status": "ok",
    "version": "1.0.0"
  }
}
```

Lỗi có một envelope thống nhất:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy tài nguyên."
  }
}
```

Hợp đồng đầy đủ nằm tại [openapi.yaml](../docs/api/openapi.yaml).

Hai probe công khai chỉ trả trạng thái tối thiểu và không được tiết lộ cấu hình, dependency, stack trace hoặc dữ liệu khách hàng. API nghiệp vụ tương lai không được kế thừa `security: []`; mỗi operation phải khai báo cơ chế xác thực và quyền tương ứng.

## Hardening hiện có

- Không bật CORS; mô hình mặc định là cùng origin qua reverse proxy.
- Mọi response có `Cache-Control: no-store`, `nosniff`, frame deny, CSP chặn nội dung và referrer policy.
- Giới hạn tối đa `100` header; header timeout `10s`, request timeout `15s`, keep-alive timeout `5s`.
- Client protocol error bị đóng socket, không phản chiếu nội dung lỗi nội bộ.
- `SIGINT` và `SIGTERM` kích hoạt graceful shutdown, có giới hạn chờ `10s`.
- Log lifecycle ở dạng JSON và không ghi request body, header xác thực hoặc secret.

Các kiểm soát này chưa thay thế authentication, authorization, validation nghiệp vụ, rate limiting, CSRF, audit bất biến, encryption at rest hoặc WAF.

## Kiểm thử

```powershell
npm run test:backend
npm run lint:backend
npm run build:backend
```

Test khởi tạo HTTP server thật trên cổng ngẫu nhiên và kiểm tra health, readiness, readiness thất bại, security headers, `404` và `405`.

## Hướng dẫn vận hành

1. Khởi động process bằng process manager có restart policy và giới hạn tài nguyên.
2. Cấu hình liveness probe tới `/api/v1/health` và readiness probe tới `/api/v1/ready`.
3. Chỉ đưa instance vào load balancer khi readiness trả `200`.
4. Khi deploy, gửi `SIGTERM`, ngừng cấp request mới và chờ log `api_shutdown_complete`.
5. Cảnh báo khi health/readiness lỗi, tỷ lệ `5xx` tăng, latency tăng hoặc process restart bất thường.
6. Không log credential, token, ticket body, PII hoặc dữ liệu hạ tầng nhạy cảm.

Readiness hiện chỉ phản ánh trạng thái process vì chưa có dependency. Khi thêm PostgreSQL, queue hoặc search engine, readiness phải kiểm tra dependency thiết yếu với timeout ngắn, không trả chi tiết nhạy cảm cho client.

## Thêm API nghiệp vụ

1. Cập nhật `docs/api/openapi.yaml` và chốt schema/permission trước.
2. Viết test thất bại cho happy path, validation, authentication, authorization và cross-tenant denial.
3. Triển khai route versioned dưới `/api/v1/`.
4. Lấy tenant và role từ session đã xác minh, không lấy từ field do client tự quyết định.
5. Dùng error envelope hiện tại và không lộ stack trace.
6. Bổ sung rate limit, audit, idempotency và observability theo rủi ro endpoint.
7. Chạy security review, SAST/SCA/secret scan và pentest trước go-live.
