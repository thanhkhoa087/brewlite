# ADR 002: Kiến trúc Hướng Module và Phân tầng trong NestJS

- **Trạng thái:** Chấp thuận (Accepted)
- **Ngày quyết định:** 2026-10-16
- **Tác giả:** Nhóm phát triển BrewLite

## Bối cảnh (Context)
Ứng dụng backend cần xử lý nhiều nghiệp vụ độc lập: Quản lý Menu sản phẩm, Giỏ hàng, Đặt đơn hàng, Thanh toán, Xác thực người dùng, và Giám sát sức khỏe hệ thống. Nếu tổ chức lộn xộn sẽ dẫn đến mã nguồn spaghetti, khó viết unit test.

## Quyết định (Decision)
Tổ chức Backend NestJS theo mô hình **Domain Modules & Layered Architecture**:
- Tách thành các module độc lập: `AuthModule`, `ProductsModule`, `OrdersModule`, `PaymentsModule`, `HealthModule`, `PrismaModule`.
- Mỗi module chia thành 3 tầng: `Controller` (HTTP REST), `Service` (Business Logic), `PrismaService` (Data Access).
- Sử dụng NestJS Dependency Injection để tiêm phụ thuộc, hỗ trợ mock dễ dàng khi chạy unit test.

## Hệ quả & Đánh giá (Consequences)
- **Ưu điểm:** Độ kết dính cao (High Cohesion), độ phụ thuộc thấp (Loose Coupling), cấu trúc tường minh, dễ chia việc trong sprint.
- **Hạn chế:** Cần khai báo nhiều boilerplate code (Module, Controller, Service).
