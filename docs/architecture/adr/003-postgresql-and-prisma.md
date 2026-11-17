# ADR 003: Sử dụng PostgreSQL và Prisma ORM với Cơ chế Migration Tự động

- **Trạng thái:** Chấp thuận (Accepted)
- **Ngày quyết định:** 2026-10-17
- **Tác giả:** Nhóm phát triển BrewLite

## Bối cảnh (Context)
Dữ liệu đơn hàng, thanh toán và kiểm kê tồn kho đòi hỏi tính toàn vẹn cao (ACID transactions), không cho phép sai lệch số tiền hoặc bán âm tồn kho. Cần cơ chế migration đồng bộ cấu trúc bảng giữa các môi trường Local, CI và Production.

## Quyết định (Decision)
- Lựa chọn cơ sở dữ liệu quan hệ **PostgreSQL 16**.
- Sử dụng **Prisma ORM** để quản lý Schema (`prisma/schema.prisma`), tự động tạo migration (`prisma migrate dev / deploy`) và sinh Client TypeScript tự động.
- Mọi thao tác tạo đơn và trừ tồn kho phải thực thi bên trong `$transaction`.

## Hệ quả & Đánh giá (Consequences)
- **Ưu điểm:** Đảm bảo toàn vẹn dữ liệu, type-safe 100% trong code TypeScript, kiểm soát lịch sử thay đổi schema bằng git commit.
- **Hạn chế:** Cần bước `prisma generate` trong quá trình build container.
