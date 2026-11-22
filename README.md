# BrewLite - Cashless Coffee Ordering System

Hệ thống đặt đồ uống và thanh toán không dùng tiền mặt (**NestJS + Next.js + PostgreSQL + Prisma**).

---

## Yêu cầu môi trường (Prerequisites)

- **Node.js**: v20 trở lên (khuyến nghị v22 hoặc v24)
- **Docker & Docker Compose** (để chạy PostgreSQL hoặc chạy trọn gói cả hệ thống)
- **npm** (đi kèm Node.js)

---

## Hướng dẫn Cài đặt & Khởi chạy

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyến nghị)

Chạy đồng thời cả 3 dịch vụ (Database, Backend API, Frontend Web) chỉ với 1 câu lệnh duy nhất tại thư mục gốc:

```bash
docker compose up -d --build
```

Sau khi khởi chạy thành công:
- **Giao diện Khách hàng (Next.js):** [http://localhost:3000](http://localhost:3000)
- **Giao diện Quầy Barista & Quản lý (KDS):** [http://localhost:3000/barista](http://localhost:3000/barista)
- **Backend REST API (NestJS):** [http://localhost:3001](http://localhost:3001)
- **Cơ sở dữ liệu (PostgreSQL):** `localhost:5432`

Để dừng hệ thống:

```bash
docker compose down
```

---

### Cách 2: Khởi chạy thủ công từng phân hệ (Local Development)

#### 1. Khởi động Cơ sở dữ liệu PostgreSQL

Khởi chạy container PostgreSQL thông qua Docker:

```bash
docker compose up -d db
```

#### 2. Cài đặt và Khởi chạy Backend (Port 3001)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

*(Hệ thống hỗ trợ tự động Fallback sang dữ liệu In-Memory nếu chưa kết nối cơ sở dữ liệu).*

#### 3. Cài đặt và Khởi chạy Frontend (Port 3000)

Mở một cửa sổ Terminal mới:

```bash
cd frontend
npm install
npm run dev
```

---

## Chạy Kiểm thử Tự động (Unit Tests)

Chạy bộ kiểm thử Jest kiểm tra toàn bộ luồng máy trạng thái (State Machine), kiểm soát tương tranh (Optimistic Locking), mã giảm giá/điểm thưởng và thanh toán Idempotent:

```bash
cd backend
npm test
```

---

## Tài khoản Seed sẵn dùng thử (Demo Accounts)

Hệ thống đã chuẩn bị sẵn 3 tài khoản mẫu (dùng được cả trên PostgreSQL lẫn chế độ Offline In-Memory):

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Họ tên hiển thị |
| :--- | :--- | :---: | :--- |
| **Khách hàng (`CUSTOMER`)** | `user@brewlite.vn` | `123456` | Nguyễn Văn A |
| **Quản trị viên (`ADMIN`)** | `admin@brewlite.vn` | `123456` | Quản Lý Cửa Hàng |
| **Barista (`BARISTA`)** | `barista@brewlite.vn` | `123456` | Nhân Viên Pha Chế |

### Mã giảm giá (Voucher) mẫu

- `GIAM10`: Giảm 10% (tối đa 30.000 đ)
- `BREW20`: Giảm 20.000 đ cho đơn từ 40.000 đ
- `WELCOME`: Giảm 15.000 đ cho khách hàng mới

---

## Kiểm thử API bằng Postman

Import trực tiếp 2 file sau vào Postman để chạy toàn bộ kịch bản test tự động:

- **Collection:** `docs/postman/BrewLite.postman_collection.json`
- **Environment:** `docs/postman/BrewLite.postman_environment.json`

---

## Danh mục Endpoint API chính

| Phương thức | Endpoint | Chức năng | Xác thực JWT |
| :---: | :--- | :--- | :---: |
| `POST` | `/auth/register` | Đăng ký tài khoản người dùng mới | Không |
| `POST` | `/auth/login` | Đăng nhập và nhận JWT Token | Không |
| `GET` | `/products` | Danh sách menu đồ uống (tự tính số ly từ kho) | Không |
| `GET` | `/products/:id` | Chi tiết một món nước | Không |
| `GET` | `/products/ingredients/stock` | Xem khối lượng tồn kho nguyên liệu thô (g/ml) | Không |
| `PATCH` | `/products/ingredients/:id/stock` | Cập nhật số lượng nguyên liệu thô trong kho | Không |
| `POST` | `/orders` | Tạo đơn hàng mới (hỗ trợ Voucher, Idempotency-Key, Optimistic Lock) | **Có** |
| `GET` | `/orders/me` | Lấy lịch sử đơn hàng của người dùng hiện tại | **Có** |
| `GET` | `/orders/:id` | Xem chi tiết một đơn hàng | **Có** |
| `POST` | `/orders/:id/cancel` | Hủy đơn hàng và tự động hoàn trả nguyên liệu vào kho | **Có** |
| `PATCH` | `/orders/:id/status` | Cập nhật trạng thái đơn hàng theo State Machine (KDS) | **Có (Barista / Admin)** |
| `GET` | `/orders/barista/queue` | Lấy danh sách đơn hàng chờ pha chế tại quầy KDS | **Có (Barista / Admin)** |
| `POST` | `/payments` | Thanh toán không tiền mặt (Idempotent + tích điểm Loyalty) | **Có** |
| `GET` | `/auth/baristas` | Lấy danh sách tài khoản Barista | **Có (Admin)** |
| `POST` | `/auth/baristas` | Quản lý tạo tài khoản Barista mới | **Có (Admin)** |
| `DELETE` | `/auth/baristas/:id` | Quản lý xóa tài khoản Barista | **Có (Admin)** |
