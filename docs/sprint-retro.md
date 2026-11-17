# Báo Cáo Sprint Review & Sprint Retrospective (Hệ Thống BrewLite)

Tài liệu phục vụ buổi **Sprint Review / Demo** bàn giao sản phẩm cho Giảng viên (đóng vai Product Owner/Khách hàng) theo chuẩn quy trình **Agile Scrum** (Mục 2 và Mục 11 trong Đề bài BTL BrewLite).

---

## 1. Sprint 1 Review & Retrospective
- **Thời gian thực hiện:** Sprint 1 (Tuần 1 – Tuần 2)
- **Mục tiêu (Sprint Goal):** Nền tảng kiến trúc & hiển thị menu (Hoàn thành Task 1, 2, 3, 4).

### 1.1. Kết quả đạt được (Sprint 1 Review)
- **Task 1 (Khởi tạo dự án):** Thiết lập Monorepo với 2 thư mục `backend/` (NestJS) và `frontend/` (Next.js), file `.env.example`, Git repository và README hướng dẫn ban đầu.
- **Task 2 (API Menu):** Xây dựng NestJS REST API `GET /products` và `GET /products/:id`, tích hợp Prisma ORM kết nối PostgreSQL và cơ chế tự động fallback in-memory nếu DB chưa khởi động.
- **Task 3 (Trang Menu):** Xây dựng giao diện danh mục đồ uống Next.js (TailwindCSS) hiển thị ảnh, giá VNĐ, xử lý các trạng thái Loading skeleton và Empty state.
- **Task 4 (Chi tiết & Tùy chọn):** Màn hình chi tiết cho phép chọn Size (S/M/L) và Topping (Trân châu/Kem), tự động cộng tiền tùy biến theo thời gian thực.
- Thiết lập CI pipeline cơ bản trên GitHub Actions (`.github/workflows/ci.yml`).

### 1.2. Đánh giá cải tiến (Sprint 1 Retrospective)
- **Điều làm tốt (What went well):**
  - Cấu trúc thư mục Monorepo rõ ràng, tách bạch độc lập Frontend và Backend.
  - Thiết kế UI Clean & Modern, bám sát wireframe mẫu trong đề bài.
  - Cơ chế Fallback in-memory giúp các thành viên frontend code và test độc lập không bị chặn bởi backend.
- **Điều cần cải thiện (What could be improved):**
  - Thời gian chạy GitHub Actions ban đầu hơi chậm do chưa tối ưu cache các gói `node_modules`.
  - Cần thống nhất quy ước commit (Conventional Commits) giữa các thành viên.
- **Hành động khắc phục (Action Items):**
  - Bổ sung cache cho `npm install` trong workflow GitHub Actions.
  - Thống nhất áp dụng tiền tố commit `feat:`, `fix:`, `refactor:`, `docs:`.

---

## 2. Sprint 2 Review & Retrospective
- **Thời gian thực hiện:** Sprint 2 (Tuần 3 – Tuần 4)
- **Mục tiêu (Sprint Goal):** Giỏ hàng & đặt đơn & đăng nhập (Hoàn thành Task 5, 6, 7).

### 2.1. Kết quả đạt được (Sprint 2 Review)
- **Task 5 (Giỏ hàng - Cart):** Sử dụng Zustand store (`cartStore.ts`) quản lý danh sách món, gom món theo cấu hình, tăng/giảm số lượng, xóa món, tính tổng tiền tự động và badge số lượng món trên thanh điều hướng.
- **Task 6 (API Tạo đơn hàng):** Hiện thực `POST /orders`, áp dụng `class-validator` (@ValidateNested, @IsIn, @Min) để validate payload giỏ hàng chặt chẽ; lưu đơn với trạng thái ban đầu là `PENDING`.
- **Task 7 (Đăng ký / Đăng nhập JWT):** Hiện thực `POST /auth/register` và `POST /auth/login`, băm mật khẩu an toàn bằng `bcrypt` (salt 10), phát hành JSON Web Token (JWT), bảo vệ các route nhạy cảm bằng `JwtAuthGuard`.

### 2.2. Đánh giá cải tiến (Sprint 2 Retrospective)
- **Điều làm tốt (What went well):**
  - Quản lý state giỏ hàng bằng Zustand nhẹ nhàng, phản hồi mượt mà và không gây re-render thừa.
  - Phân hệ xác thực JWT hoạt động ổn định, bảo mật tốt với cơ chế mã hóa một chiều Bcrypt.
- **Điều cần cải thiện (What could be improved):**
  - Ban đầu trang Đăng nhập và Đăng ký gộp chung vào một form gây khó thao tác trên di động.
  - Chưa có cơ chế ngăn chặn việc người dùng nhấn nút Đặt đơn liên tiếp khi mạng chậm.
- **Hành động khắc phục (Action Items):**
  - Tách riêng màn hình `/login` và `/register` để tối ưu trải nghiệm người dùng (UX).
  - Nghiên cứu áp dụng cơ chế `Idempotency-Key` cho cả luồng Đặt đơn và Thanh toán ở Sprint 3.

---

## 3. Sprint 3 Review & Retrospective (Sprint Cuối & Bàn Giao)
- **Thời gian thực hiện:** Sprint 3 (Tuần 5 – Tuần 6)
- **Mục tiêu (Sprint Goal):** Thanh toán, bàn giao & nghiệp vụ nâng cao (Hoàn thành Task 8, 9, 10).

### 3.1. Kết quả đạt được (Sprint 3 Review)
- **Task 8 (Thanh toán không tiền mặt):** Tích hợp Mock Payment Service hỗ trợ Ví điện tử (`WALLET`) và Thẻ (`CARD`), xử lý thành công chuyển `PAID`, mô phỏng lỗi chuyển `PAYMENT_FAILED`.
- **Task 9 (Xác nhận, lịch sử đơn & Bàn giao):**
  - Màn hình xác nhận (`/orders/[id]/confirmation`) với timeline tiến độ thời gian thực, nút thử lại thanh toán khi gặp sự cố, nút hủy đơn nếu chưa pha chế.
  - Trang lịch sử đơn (`/orders`) gọi `GET /orders/me` hiển thị danh sách đơn đã đặt.
  - Cấu hình trọn vẹn `docker-compose.yml` khởi chạy cả 3 dịch vụ (Database PostgreSQL 16 + Backend NestJS + Frontend Next.js) chỉ bằng 1 câu lệnh duy nhất `docker compose up --build`.
  - Hoàn thiện tài liệu `README.md` hướng dẫn cài đặt và vận hành chi tiết.
- **Task 10 (Nghiệp vụ backend chuyên sâu):**
  1. *Order State Machine:* Hàm `assertTransition` kiểm soát nghiêm ngặt luồng trạng thái (`PENDING -> PAID -> PREPARING -> READY -> COMPLETED`), chặn đứng mọi hành vi nhảy cóc.
  2. *Thanh toán Idempotent:* Sử dụng `Idempotency-Key` (UUIDv4) ngăn chặn trừ tiền / tạo giao dịch thanh toán 2 lần.
  3. *Kiểm soát tồn kho khi đặt đồng thời (Concurrency Control):* Kết hợp PostgreSQL Transaction (`$transaction`) với Khóa lạc quan (Optimistic Locking) trên trường `Product.version`, ngăn chặn triệt để tình trạng bán vượt tồn kho (No Overselling).
  4. *Khuyến mãi & Điểm thưởng:* Áp dụng các voucher (`GIAM10`, `BREW20`, `WELCOME`) và tự động tích lũy điểm thưởng thành viên (`User.loyaltyPoints`: 1 điểm / 10.000 đ) khi đơn chuyển sang `PAID`.
- **Phần mở rộng giá trị cao (Beyond Scope):**
  - Quầy pha chế Barista KDS (`/barista`) cho nhân viên tiếp nhận đơn và cập nhật trạng thái chế biến.
  - Cơ chế Hủy đơn và Tự động hoàn trả tồn kho (Restock) tại `POST /orders/:id/cancel`.
  - Bộ kiểm thử tự động Jest đạt **100% tỉ lệ đỗ (34/34 unit/integration tests passed)**.

### 3.2. Đánh giá cải tiến (Sprint 3 Retrospective)
- **Điều làm tốt (What went well):**
  - Hoàn thành đầy đủ 10/10 Task theo đúng Definition of Done (DoD), không có lỗi build trên cả Backend và Frontend.
  - Luồng nghiệp vụ End-to-End từ Chọn món $\rightarrow$ Tùy biến $\rightarrow$ Giỏ hàng $\rightarrow$ Xác thực $\rightarrow$ Áp voucher $\rightarrow$ Thanh toán $\rightarrow$ Theo dõi trạng thái hoạt động trơn tru.
  - Bộ unit test bao phủ toàn bộ các kịch bản khó nhất (Tương tranh đồng thời, Idempotency, State Machine).
  - Tự động hóa đóng gói môi trường hoàn chỉnh qua Docker Compose và GitHub Actions CI.
- **Điều cần cải thiện (What could be improved):**
  - Cơ chế đồng bộ trạng thái đơn hàng hiện tại đang dùng Polling định kỳ 3 giây; nếu lượng người dùng tăng cao có thể gây tải thêm cho server.
  - Chưa hỗ trợ đa ngôn ngữ (i18n) cho giao diện.
- **Ghi nhận Backlog cho phiên bản sau (Backlog for Next Version - v1.1):**
  1. Nâng cấp cơ chế đồng bộ trạng thái đơn hàng sang **WebSocket / Server-Sent Events (SSE)** để giảm tải API polling.
  2. Tích hợp cổng thanh toán thực tế (VNPAY / MoMo Sandbox / Stripe API).
  3. Xây dựng phân hệ Quản trị viên (Admin Dashboard) để quản lý danh mục món nước, tồn kho nguyên liệu và thống kê doanh thu.
