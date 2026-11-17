# Bối Cảnh, Stakeholder và Phạm Vi Hệ Thống BrewLite

## 1. Bối cảnh dự án (Business Context)
Trong mô hình kinh doanh đồ uống (chuỗi quán cà phê và trà hiện đại), tình trạng quá tải tại quầy order vào các khung giờ cao điểm (giờ đi làm buổi sáng, giờ nghỉ trưa) dẫn đến thời gian chờ đợi kéo dài (trung bình 15-20 phút), tăng tỷ lệ hủy đơn, giảm trải nghiệm khách hàng và gây áp lực lớn lên nhân viên pha chế lẫn thu ngân.

**BrewLite** là giải pháp phần mềm tinh gọn (Lite Order System) được phát triển nhằm số hóa toàn diện quy trình đặt món:
- Khách hàng có thể truy cập nhanh chóng qua giao diện Web di động (PWA - Mobile First) mà không cần cài đặt ứng dụng cồng kềnh.
- Hệ thống hỗ trợ xem menu thời gian thực, tùy biến thức uống (size, lượng đường, đá, topping), thanh toán trực tuyến mô phỏng an toàn, theo dõi tiến độ chuẩn bị món minh bạch.
- Giảm thiểu sai sót trong khâu ghi nhận đơn hàng, rút ngắn thời gian phục vụ tại quầy xuống dưới 3 phút/đơn.

---

## 2. Bảng phân tích Stakeholders (Stakeholder Analysis)

| Stakeholder | Vai trò & Trách nhiệm | Mục tiêu chính | Kỳ vọng cốt lõi |
| :--- | :--- | :--- | :--- |
| **Khách hàng (Customer)** | Người dùng cuối đặt đồ uống qua ứng dụng PWA | Đặt món nhanh, thanh toán mượt mà, theo dõi đơn chuẩn xác | Giao diện thân thiện, tải nhanh (< 2s), cập nhật trạng thái đơn theo thời gian thực, không bị lỗi trừ tiền trùng lặp |
| **Nhân viên quầy (Barista/Cashier)** | Tiếp nhận thông tin đơn hàng và chế biến đồ uống | Nắm rõ danh sách đơn cần làm và chi tiết tùy biến của món | Không bỏ sót yêu cầu tùy chỉnh (topping, size), trạng thái đơn được đồng bộ chính xác |
| **Quản lý cửa hàng (Store Manager)** | Giám sát vận hành, theo dõi doanh thu và menu | Tối ưu hóa hiệu suất quầy, kiểm soát tồn kho và doanh thu | Dữ liệu giao dịch toàn vẹn, báo cáo đơn hàng rõ ràng, hệ thống vận hành ổn định không downtime |
| **Giảng viên / Khách hàng nghiệm thu** | Đánh giá kiến trúc, mã nguồn, quy trình CI/CD và sản phẩm | Kiểm định năng lực kỹ thuật và chất lượng bàn giao | Đầy đủ tạo phẩm kỹ thuật, code chuẩn modular, CI/CD tự động, sản phẩm chạy thật trên Production |
| **Nhóm phát triển (Dev Team)** | Thiết kế kiến trúc, lập trình full-stack, kiểm thử và triển khai | Xây dựng hệ thống mở rộng tốt, code sạch, test coverage cao | Kiến trúc monorepo dễ bảo trì, quy trình CI/CD tin cậy, tài liệu hóa kỹ thuật chi tiết |
| **Đơn vị thanh toán (Payment Provider)** | Cung cấp cổng thanh toán trực tuyến (Mock Gateway) | Xử lý giao dịch an toàn, đảm bảo tính bất biến (idempotency) | Hạn chế tối đa rủi ro double-spending, hỗ trợ retry và callback/webhook an toàn |

---

## 3. Phạm vi dự án (Project Scope)

### 3.1. Phạm vi trong MVP (In-Scope MVP)
1. **Xem thực đơn (Menu Browsing):** Danh sách sản phẩm phân loại theo danh mục (Cà phê, Trà sữa, Trà trái cây, Bánh), hỗ trợ tìm kiếm và lọc.
2. **Chi tiết & Tùy biến món (Product Customization):** Chọn size (S/M/L), mức đường/đá, lựa chọn thêm topping (trân châu đen, thạch phô mai, kem cheese).
3. **Giỏ hàng (Cart Management):** Thêm, sửa số lượng, xóa món, tính toán tổng tiền tạm tính và chiết khấu tức thì.
4. **Xác thực người dùng (Authentication):** Đăng ký, đăng nhập tài khoản khách hàng, phát hành và xác thực JWT token an toàn.
5. **Đặt đơn & Thanh toán (Checkout & Mock Payment):**
   - Tạo đơn hàng có kiểm tra tồn kho và transactional integrity trong PostgreSQL.
   - Xử lý thanh toán mô phỏng (Thẻ ATM/Visa, Ví MoMo) có cơ chế **Idempotency Key** chống double charge.
6. **Theo dõi đơn hàng (Order Tracking):** Xem chi tiết đơn hàng, dòng thời gian trạng thái (PENDING -> PAID -> PREPARING -> COMPLETED).
7. **Lịch sử đơn hàng (Order History):** Khách hàng xem lại các đơn đã đặt.
8. **Kiến trúc & Hạ tầng CI/CD:**
   - Frontend Next.js mobile-first PWA, Backend NestJS modular architecture, cơ sở dữ liệu PostgreSQL.
   - Containerization với Docker & Docker Compose.
   - Pipeline CI tự động (Lint -> Unit Test -> Build) và CD triển khai lên Production.

### 3.2. Phạm vi mở rộng (Future Extended Scope)
- Tích hợp cổng thanh toán thực tế (VNPAY / MoMo Production Sandbox).
- Cổng quản trị phân quyền cho Barista (KDS - Kitchen Display System) với WebSocket real-time notification.
- Hệ thống tích điểm đổi voucher (Loyalty & Rewards Program).
- Đẩy thông báo Web Push Notification khi đồ uống đã pha chế xong.

### 3.3. Ngoài phạm vi (Out-of-Scope)
- Vận chuyển ngoại thành (Delivery logistics) - chỉ hỗ trợ Pick-up tại quán hoặc bán kính gần.
- Quản lý ca làm việc và bảng chấm công của nhân sự nội bộ.
- Phân tích dự báo doanh thu bằng AI/ML.

---

## 4. Giả định, Ràng buộc và Rủi ro ban đầu

### 4.1. Giả định (Assumptions)
- Khách hàng sử dụng smartphone có kết nối Internet (4G/5G/Wi-Fi) và trình duyệt hiện đại (Chrome, Safari).
- Giao dịch thanh toán trực tuyến được mô phỏng có tỷ lệ thành công/thất bại theo kịch bản xác định nhằm phục vụ kiểm thử và nghiệm thu.
- Tốc độ mạng của môi trường triển khai đạt tiêu chuẩn băng thông thông thường.

### 4.2. Ràng buộc (Constraints)
- **Công nghệ bắt buộc:** Frontend phải dùng **Next.js** (mobile-first/PWA); Backend phải dùng **NestJS**; Cơ sở dữ liệu lưu trữ bắt buộc là **PostgreSQL**; Đóng gói container bằng **Docker**.
- **Quy trình tuần tự:** Năm task nghiệp vụ phải được hoàn thành đúng thứ tự: Yêu cầu -> Mô hình hóa -> Kiến trúc -> Sprint 1 -> Sprint 2 & CI/CD Delivery.
- **Môi trường Production:** Ứng dụng phải có domain/URL truy cập được qua HTTPS, database tách biệt và bảo mật secrets.

### 4.3. Rủi ro ban đầu và Biện pháp giảm thiểu (Risks & Mitigations)

| STT | Rủi ro (Risk) | Khả năng / Mức độ | Biện pháp giảm thiểu (Mitigation) |
| :---: | :--- | :---: | :--- |
| **R1** | Khách hàng bấm thanh toán nhiều lần dẫn đến trừ tiền trùng lặp (Double Spending). | Cao / Nghiêm trọng | Thiết kế header `Idempotency-Key` sinh tự động từ Client, Backend kiểm tra trạng thái transaction trước khi xử lý. |
| **R2** | Sai lệch số lượng tồn kho khi nhiều khách cùng đặt một món (Race condition). | Trung bình / Cao | Sử dụng Database Transaction kết hợp Pessimistic Locking hoặc Atomic Update trong PostgreSQL. |
| **R3** | Lỗi build pipeline hoặc test fail làm chậm tiến độ giao hàng. | Trung bình / Trung bình | Áp dụng Quality Gate nghiêm ngặt trên GitHub Actions: PR chỉ được merge khi vượt qua Lint, Unit Test và Build. |
| **R4** | Lộ lọt Secret / Database credentials lên public repository. | Thấp / Nghiêm trọng | Sử dụng `.env.example`, thiết lập `.gitignore`, inject secret an toàn qua GitHub Secrets và Environment Variables trên Cloud. |
