# ADR 004: Cơ chế Xác thực và Phân quyền bằng JWT (JSON Web Token)

- **Trạng thái:** Chấp thuận (Accepted)
- **Ngày quyết định:** 2026-10-18
- **Tác giả:** Nhóm phát triển BrewLite

## Bối cảnh (Context)
Ứng dụng cần phục vụ khách hàng trên nền tảng Web di động (PWA) với kiến trúc Stateless API. Cần giải pháp xác thực bảo mật, nhẹ nhàng, không lưu session trên server để dễ mở rộng (scale-out).

## Quyết định (Decision)
- Áp dụng chuẩn **JWT (JSON Web Token)** với thuật toán ký `HS256`.
- Token chứa thông tin cơ bản: `sub (userId)`, `email`, `role`, thời hạn hết hạn (`exp = 7d`).
- Phía Backend sử dụng `@nestjs/passport` và `passport-jwt` để triển khai `JwtAuthGuard`.
- Mật khẩu người dùng được băm an toàn bằng `bcrypt` trước khi lưu vào PostgreSQL.

## Hệ quả & Đánh giá (Consequences)
- **Ưu điểm:** Stateless, tải máy chủ thấp, phù hợp với kiến trúc Next.js SSR và PWA.
- **Hạn chế:** Cần thu hồi token qua cơ chế Blacklist/Redis nếu muốn vô hiệu hóa tức thì trước khi token hết hạn.
