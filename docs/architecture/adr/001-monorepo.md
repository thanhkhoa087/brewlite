# ADR 001: Lựa chọn cấu trúc Monorepo cho Dự án BrewLite

- **Trạng thái:** Chấp thuận (Accepted)
- **Ngày quyết định:** 2026-10-15
- **Tác giả:** Nhóm phát triển BrewLite

## Bối cảnh (Context)
Dự án bao gồm ứng dụng Web Frontend (Next.js), Backend API (NestJS), bộ tài liệu kiến trúc (docs) và các kịch bản kiểm thử E2E/CI-CD. Nhóm cần cân nhắc giữa hai mô hình:
1. **Multi-repo (Polyrepo):** Chia mỗi phần thành một repository riêng biệt.
2. **Monorepo:** Đặt toàn bộ `apps/web`, `apps/api`, `docs` và `.github/workflows` trong một repository duy nhất.

## Quyết định (Decision)
Quyết định áp dụng mô hình **Monorepo** với cấu trúc thư mục phân định rõ ràng:
- `apps/web/`: Mã nguồn Next.js.
- `apps/api/`: Mã nguồn NestJS API.
- `docs/`: Tài liệu đặc tả, sơ đồ và kiến trúc có version control.
- `tests/`: Bộ test tích hợp & E2E liên tầng.

## Hệ quả & Đánh giá (Consequences)
- **Ưu điểm:**
  - Đồng bộ mã nguồn, dễ dàng chia sẻ kiểu dữ liệu DTO/Interface.
  - Quản lý phiên bản thống nhất: một Pull Request có thể bao quát cả thay đổi API lẫn cập nhật giao diện và tài liệu.
  - Đơn giản hóa thiết lập CI/CD và Docker Compose.
- **Hạn chế:** Cần cấu hình đường dẫn làm việc trong CI workflow để tránh chạy lại test của module không thay đổi.
