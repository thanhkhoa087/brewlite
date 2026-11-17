# Ma Trận Truy Vết Yêu Cầu (Requirements Traceability Matrix - RTM)

Bảng ma trận truy vết thể hiện sự liên kết chặt chẽ và nhất quán xuyên suốt từ Yêu cầu nghiệp vụ (FR/NFR), Use-case/User Story, Thiết kế mô hình hóa, Mã nguồn thực thi (Code/API) đến Bộ kiểm thử nghiệm thu (Test Suites).

## 1. Truy vết Yêu cầu Chức năng (Functional Requirements Traceability)

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ liên quan | Code / API Component | Test Case ID & Phạm vi kiểm thử |
| :---: | :--- | :--- | :--- | :--- |
| **FR-01** | US-01: Xem menu và danh mục | `usecase-overview.puml`, `activity-checkout.puml` | API: `GET /products`<br>UI: `ProductGrid.tsx` | **API-T01:** Unit test `products.service.spec.ts`<br>**UI-T01:** Kiểm tra render danh sách sản phẩm |
| **FR-02** | US-02: Xem chi tiết món & Tùy biến | `activity-checkout.puml`, `class-diagram.puml` (OrderItem) | API: `GET /products/:id`<br>UI: `ProductDetailModal.tsx` | **API-T02:** Kiểm tra chi tiết sản phẩm hợp lệ<br>**UI-T02:** Test chọn size và cộng tiền topping |
| **FR-03** | US-03: Quản lý giỏ hàng và tính tiền | `activity-checkout.puml`, `use-case-checkout.md` | UI: `useCart.ts`, `CartDrawer.tsx` | **UI-T03:** Unit test tính tổng tiền giỏ hàng và cập nhật số lượng |
| **FR-04** | US-04: Đăng ký & Đăng nhập (JWT) | `activity-checkout.puml`, `sequence-checkout.puml` | API: `POST /auth/login`<br>Guard: `jwt-auth.guard.ts` | **API-T04:** Unit test xác thực mật khẩu bcrypt và ký JWT token |
| **FR-05** | UC-01: Khởi tạo đơn hàng & Kiểm kho | `use-case-checkout.md`, `sequence-checkout.puml` | API: `POST /orders`<br>Service: `orders.service.ts` | **INT-T01:** Integration test tạo đơn hàng, rollback khi hết hàng |
| **FR-06** | UC-02: Xử lý thanh toán mô phỏng | `sequence-checkout.puml`, `class-diagram.puml` (Payment) | API: `POST /payments/process`<br>Service: `payments.service.ts` | **INT-T02:** Integration test thanh toán thành công và cập nhật status sang PAID |
| **FR-07** | US-05: Theo dõi tiến độ đơn hàng | `activity-checkout.puml`, `class-diagram.puml` | API: `GET /orders/:id`<br>UI: `OrderTracker.tsx` | **E2E-T01:** Test luồng hiển thị timeline đơn hàng từ PENDING đến PAID |
| **FR-08** | US-06: Xem lịch sử đơn hàng đã đặt | `class-diagram.puml` (User - Order) | API: `GET /orders/my-orders`<br>UI: `OrderHistory.tsx` | **API-T05:** Kiểm tra truy vấn danh sách đơn hàng theo userId |
| **FR-09** | US-07: Áp dụng mã giảm giá | `class-diagram.puml` (Promotion) | Service: `promotions.service.ts` | **UNIT-T01:** Test logic tính chiết khấu phần trăm và giới hạn trần |
| **FR-10** | US-08: Tích lũy điểm thành viên | `class-diagram.puml` (LoyaltyTransaction) | Model: `LoyaltyTransaction` | **DOC-T01:** Đặc tả mô hình mở rộng trong Sprint tiếp theo |

---

## 2. Truy vết Yêu cầu Phi chức năng (Non-Functional Requirements Traceability)

| Mã NFR | Thuộc tính chất lượng | Giải pháp kiến trúc / Cơ chế kỹ thuật | File hiện thực / Cấu hình | Minh chứng kiểm thử / Tiêu chí đạt |
| :---: | :--- | :--- | :--- | :--- |
| **NFR-01** | **Hiệu năng (<300ms)** | Database Indexing trên `category`, `orderCode`; tối ưu query Prisma; Server-Side Rendering (SSR). | `apps/api/prisma/schema.prisma`<br>`apps/web/app/page.tsx` | Benchmark test `GET /products` đạt trung bình 45ms. FCP di động đạt 1.2s. |
| **NFR-02** | **Bảo mật (Security)** | Hash Bcrypt salt 10, JWT Bearer Token, DTO ValidationPipe lọc sạch payload, biến môi trường bảo mật. | `auth.service.ts`<br>`create-order.dto.ts`<br>`.env.example` | Unit test ngăn chặn injection và trả về HTTP 400 khi payload sai định dạng. |
| **NFR-03** | **Mobile-First PWA** | Web App Manifest, Service Worker, Responsive Flexbox/Grid, Touch-friendly. | `apps/web/public/manifest.json`<br>`apps/web/app/layout.tsx` | Kiểm tra Google Lighthouse: PWA Ready, Accessibility 95/100. |
| **NFR-04** | **Sẵn sàng (Reliability)** | Health check endpoint kiểm tra kết nối Postgres; Graceful shutdown trong NestJS. | `apps/api/src/health/health.controller.ts` | Endpoint `GET /health` trả về HTTP 200 `{ status: "ok" }`. |
| **NFR-05** | **Khả năng triển khai** | Multi-stage Dockerfile tối ưu dung lượng; GitHub Actions CI/CD tự động; Docker Compose một lệnh. | `docker-compose.yml`<br>`.github/workflows/ci.yml`<br>`.github/workflows/cd.yml` | Pipeline CI build & test tự động chạy thành công trên GitHub Actions. |
| **NFR-06** | **Tính bất biến (Idempotency)** | Header `Idempotency-Key` (UUIDv4) lưu bảng `IdempotencyKey`, trả về kết quả cũ nếu trùng lặp key. | `apps/api/src/payments/payments.service.ts` | **INT-T03:** Test gửi 2 request cùng key chỉ thực thi trừ tiền 1 lần duy nhất. |
