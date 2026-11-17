# ADR 005: Xây dựng Cổng Thanh toán Mô phỏng với Cơ chế Idempotency Key

- **Trạng thái:** Chấp thuận (Accepted)
- **Ngày quyết định:** 2026-10-19
- **Tác giả:** Nhóm phát triển BrewLite

## Bối cảnh (Context)
Trong thanh toán thương mại điện tử và đặt món trên di động, hiện tượng kết nối mạng chập chờn hoặc người dùng nhấn liên tiếp nút "Thanh toán" có thể dẫn đến việc client gửi nhiều request giống hệt nhau. Nếu không xử lý, tài khoản người dùng có nguy cơ bị trừ tiền nhiều lần hoặc đơn hàng bị tạo trùng lặp.

## Quyết định (Decision)
- Thiết kế **Mock Payment Service** giả lập các kịch bản ví MoMo, VNPAY, Thẻ tín dụng (hỗ trợ cả kịch bản thành công và lỗi số dư).
- Bắt buộc gắn Header `Idempotency-Key` (UUIDv4 sinh từ Client) trong mọi request `POST /payments/process`.
- Backend lưu trữ trạng thái của `Idempotency-Key` trong CSDL/Cache:
  - Nếu key mới: thực thi thanh toán và lưu kết quả.
  - Nếu key đã tồn tại và hoàn tất: lập tức trả về kết quả đã lưu mà không gọi sang cổng thanh toán lần hai.

## Hệ quả & Đánh giá (Consequences)
- **Ưu điểm:** Triệt tiêu hoàn toàn rủi ro double-charge, đảm bảo tính nhất quán và trải nghiệm tin cậy cho người dùng.
- **Hạn chế:** Cần thêm logic lưu trữ và định kỳ dọn dẹp các key quá hạn (> 24 giờ).
