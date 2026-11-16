# ☕ BrewLite - Cashless Coffee Ordering System

Hệ thống đặt đồ uống không dùng tiền mặt (Bài tập lớn môn Công nghệ Phần mềm - Trường Đại học Sài Gòn SGU).

---

## 👤 Thông tin Đồ án
- **Trường:** Đại học Sài Gòn (SGU) – Khoa Công nghệ Thông tin
- **Môn học:** Công nghệ Phần mềm (Software Engineering)
- **Học kỳ:** I – Năm học 2026–2027
- **Giảng viên hướng dẫn:** Thầy Từ Lãng Phiêu
- **Sinh viên thực hiện:** Trần Thanh Khoa
- **Mã số sinh viên (MSSV):** 3125410087
- **Kho lưu trữ GitHub:** [https://github.com/thanhkhoa087/brewlite](https://github.com/thanhkhoa087/brewlite)
- **CI/CD Quality Gate:** [GitHub Actions Workflow](https://github.com/thanhkhoa087/brewlite/actions) (34/34 Jest tests passing)

---

## 🛠️ Công nghệ & Kiến trúc Hệ thống

| Phân hệ | Công nghệ sử dụng | Cổng mặc định |
|:---|:---|:---:|
| **Frontend Web** | Next.js 16 (App Router, Turbopack), TypeScript, TailwindCSS, Zustand | `3000` |
| **Backend API** | NestJS 12, TypeScript, Prisma ORM, JWT, Bcrypt, Class-Validator | `3001` |
| **Cơ sở dữ liệu** | PostgreSQL 16 | `5432` |
| **Kiểm thử tự động** | Jest (34 bài kiểm thử Unit / Integration Tests) | — |
| **Đóng gói & CI/CD** | Docker, Docker Compose, GitHub Actions | — |

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyến nghị)
Khởi chạy đồng thời cả 3 dịch vụ (Database, Backend API, Frontend Web) chỉ với 1 câu lệnh duy nhất:

```bash
docker compose up --build
```

- **Giao diện Khách hàng (Next.js):** [http://localhost:3000](http://localhost:3000)
- **Giao diện Quầy Barista (KDS):** [http://localhost:3000/barista](http://localhost:3000/barista)
- **Backend REST API (NestJS):** [http://localhost:3001](http://localhost:3001)

Dừng hệ thống:
```bash
docker compose down
```

---

### Cách 2: Khởi chạy cục bộ thủ công (Local Development)

#### 1. Khởi động cơ sở dữ liệu PostgreSQL
```bash
docker compose up -d db
```

#### 2. Khởi động Backend (Port 3001)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```
*(Lưu ý: Hệ thống có sẵn cơ chế Auto-Fallback sang dữ liệu In-memory tức thì khi chưa kết nối Database, đảm bảo kiểm thử thuận tiện.)*

#### 3. Khởi động Frontend (Port 3000)
Mở một cửa sổ Terminal mới:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Chạy Kiểm thử Tự động (Unit Tests)

Dự án trang bị bộ kiểm thử tự động toàn diện kiểm tra máy trạng thái, chống trùng lặp giao dịch và kiểm soát tương tranh:

```bash
cd backend
npm test
```

**Kết quả kiểm thử:**
- `state-machine.spec.ts`: Chặn đứng các bước chuyển trạng thái sai.
- `orders.service.spec.ts`: Kiểm tra Idempotency-Key, đặt hàng đồng thời không bán vượt tồn kho (Optimistic Locking), và luồng Hủy đơn hoàn trả tồn kho (Restock).
- `payments.service.spec.ts`: Kiểm thử thanh toán thành công và mô phỏng lỗi.
- `app.controller.spec.ts`: Kiểm thử API gốc.
- **Tổng cộng: 34/34 tests passed (4 suites) - Tỷ lệ đạt 100%.**

---

## 📋 Danh mục 10 Task Hoàn thành (Theo Scrum Backlog)

- [x] **Task 1: Khởi tạo dự án và cấu trúc (1.0 điểm)**
  - Monorepo chuẩn gồm 2 phân hệ độc lập: `frontend/` (Next.js) và `backend/` (NestJS).
  - Có đầy đủ `.env.example`, `docker-compose.yml`, `README.md` và mã nguồn quản lý trên Git.
  - Cấu hình CORS và kích hoạt `ValidationPipe` tự động loại bỏ trường rác (`whitelist: true`).

- [x] **Task 2: API danh sách sản phẩm (1.0 điểm)**
  - Endpoint `GET /products` và `GET /products/:id` trả về JSON danh mục thức uống (id, tên, giá, hình ảnh, tồn kho).
  - Kết nối cơ sở dữ liệu PostgreSQL qua Prisma ORM và hỗ trợ fallback in-memory.

- [x] **Task 3: Trang Menu Frontend (1.0 điểm)**
  - Giao diện dạng lưới thẻ món (Grid) chuẩn Mobile-first, responsive đa thiết bị.
  - Xử lý mượt mà trạng thái đang tải (Skeleton Loading) và danh mục rỗng (Empty State).
  - Tích hợp Badge hiển thị số lượng món trong giỏ hàng theo thời gian thực.

- [x] **Task 4: Chi tiết và tùy chọn món nước (1.0 điểm)**
  - Cho phép tùy chọn kích cỡ: Size S (+0đ), Size M (+5.000đ), Size L (+10.000đ).
  - Cho phép chọn Topping: Trân châu (+5.000đ), Kem (+5.000đ).
  - Tự động tính toán lại đơn giá tức thì trên giao diện trước khi thêm vào giỏ.

- [x] **Task 5: Quản lý giỏ hàng trực tuyến (1.0 điểm)**
  - Quản lý state toàn cục bằng thư viện **Zustand** kết hợp lưu trữ cục bộ (`localStorage`).
  - Phân biệt món nước theo khóa tổng hợp `productId-size-toppings` để tự động cộng dồn số lượng.
  - Hỗ trợ tăng/giảm số lượng, xóa từng món hoặc xóa toàn bộ giỏ, tự tính tổng tiền thanh toán.

- [x] **Task 6: API tạo đơn hàng (1.0 điểm)**
  - Endpoint `POST /orders` tiếp nhận giỏ hàng, xác thực dữ liệu đầu vào bằng `class-validator` (`CreateOrderDto`).
  - Lưu đơn hàng mới vào cơ sở dữ liệu với trạng thái ban đầu bắt buộc là **`PENDING`** và tạo các bản ghi `OrderItem`.

- [x] **Task 7: Đăng ký / Đăng nhập và Xác thực JWT (1.0 điểm)**
  - API `POST /auth/register` và `POST /auth/login`.
  - Mật khẩu được băm an toàn bằng thư viện **Bcrypt**.
  - Cấp phát mã xác thực **JSON Web Token (JWT)** và bảo vệ các tuyến API nhạy cảm bằng `JwtAuthGuard`.

- [x] **Task 8: Tích hợp Thanh toán không tiền mặt (Mock Payment) (1.0 điểm)**
  - Lựa chọn phương thức thanh toán: Ví điện tử hoặc Thẻ ngân hàng.
  - Endpoint `POST /payments` xác thực người dùng, cập nhật đơn hàng thành **`PAID`** khi thành công hoặc **`PAYMENT_FAILED`** khi lỗi.
  - Hỗ trợ cờ `simulateFailure: true` trên giao diện để kiểm thử kịch bản thanh toán thất bại và thử lại.

- [x] **Task 9: Xác nhận đơn, Lịch sử mua hàng & Bàn giao Docker (1.0 điểm)**
  - Màn hình xác nhận (`/orders/[id]/confirmation`): Hiển thị mã đơn, trạng thái, chi tiết món, tổng tiền, quy trình phục vụ và hướng dẫn lấy nước tại quầy.
  - **Màn hình quầy Barista KDS chuyên dụng ([`/barista`](http://localhost:3000/barista)):** Tách riêng giao diện cho nhân viên pha chế, hỗ trợ xem hàng đợi, chuông báo âm thanh và chuyển trạng thái đơn.
  - Màn hình lịch sử đơn hàng (`/orders`): Gọi `GET /orders/me`, hiển thị badge trạng thái, nút thanh toán lại và nút hủy đơn.
  - Đóng gói toàn bộ dự án bằng `docker-compose.yml`.

- [x] **Task 10: Nghiệp vụ backend chuyên sâu (1.0 điểm)**
  1. **Order State Machine & Hủy đơn:** Quản lý quy trình `PENDING -> PAID -> PREPARING -> READY -> COMPLETED`. Chặn đứng mọi chuyển tiếp nhảy cóc sai quy trình qua hàm `assertTransition()`. Hỗ trợ nhánh **Hủy đơn (`CANCELLED`)** cho cả Khách hàng và Barista kèm cơ chế tự động hoàn trả tồn kho (Restock).
  2. **Thanh toán Idempotent:** Sử dụng khóa duy nhất `Idempotency-Key` (UUID) đảm bảo việc bấm thanh toán nhiều lần hoặc mạng chập chờn không bị trừ tiền hoặc tạo đơn 2 lần.
  3. **Kiểm soát tồn kho khi đặt đồng thời (Concurrency Control):** Kết hợp Database Transaction (`prisma.$transaction`) và khóa lạc quan (**Optimistic Locking**) qua trường `Product.version` và `Product.stock`, đảm bảo tuyệt đối không bán vượt số lượng tồn kho (No Overselling).
  4. **Khuyến mãi (Voucher) & Điểm thưởng thành viên (Loyalty):** Áp dụng mã giảm giá (`GIAM10`, `BREW20`, `WELCOME`) và tự động tích lũy điểm thưởng vào tài khoản khách hàng (`User.loyaltyPoints`) ngay sau khi đơn chuyển sang `PAID`.
  5. **Bộ kiểm thử tự động:** Đạt 34/34 bài test Jest kiểm chứng toàn diện cả 4 yêu cầu trên.

---

## 📡 Danh mục Endpoint API phục vụ Kiểm thử Postman

| Phương thức | Đường dẫn Endpoint | Mô tả chức năng | Bảo vệ JWT |
|:---:|:---|:---|:---:|
| `POST` | `/auth/register` | Đăng ký tài khoản người dùng mới | Không |
| `POST` | `/auth/login` | Đăng nhập hệ thống, cấp phát Bearer Token | Không |
| `GET` | `/products` | Danh sách toàn bộ thức uống trong menu | Không |
| `GET` | `/products/:id` | Xem thông tin chi tiết một món nước | Không |
| `POST` | `/orders` | Tạo đơn hàng mới (kèm Idempotency-Key) | **Có** |
| `GET` | `/orders/me` | Lấy danh sách lịch sử đơn hàng của người dùng | **Có** |
| `GET` | `/orders/:id` | Lấy chi tiết một đơn hàng theo ID | **Có** |
| `POST` | `/orders/:id/cancel` | Hủy đơn hàng và hoàn trả tồn kho tự động | **Có** |
| `PATCH` | `/orders/:id/status` | Cập nhật trạng thái đơn (Barista KDS) | **Có** |
| `GET` | `/orders/barista/queue` | Lấy hàng đợi đơn hàng cho màn hình KDS | **Có** |
| `POST` | `/payments` | Thực hiện thanh toán không tiền mặt | **Có** |

---

## 🔑 Dữ liệu Mẫu để Kiểm thử Nhanh

- **Tài khoản Khách hàng:** `user@brewlite.vn` / Mật khẩu: `123456`
- **Tài khoản Quầy Barista:** `barista@brewlite.vn` / Mật khẩu: `123456`
- **Mã Voucher giảm giá:**
  - `GIAM10`: Giảm 10% tổng hóa đơn.
  - `BREW20`: Giảm 20.000 đ cho đơn hàng từ 40.000 đ trở lên.
  - `WELCOME`: Giảm 15.000 đ chào mừng khách hàng mới.
