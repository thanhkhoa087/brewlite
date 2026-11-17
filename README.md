## BrewLite - Cashless Coffee Ordering System

Hệ thống đặt đồ uống và thanh toán không dùng tiền mặt (NestJS + Next.js + PostgreSQL).

---

## Yêu cầu môi trường (Prerequisites)

- **Node.js**: v20 trở lên (khuyến nghị v22 hoặc v24)
- **Docker & Docker Compose** (để chạy database hoặc chạy toàn bộ hệ thống)
- **npm** (đi kèm Node.js)

---

## Hướng dẫn Cài đặt & Khởi chạy

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyến nghị)

Chạy đồng thời cả 3 dịch vụ (Database, Backend API, Frontend Web) chỉ với 1 câu lệnh duy nhất:

```bash
docker compose up --build
```

Sau khi khởi chạy thành công:
- **Giao diện Khách hàng (Next.js):** [http://localhost:3000](http://localhost:3000)
- **Giao diện Quầy Barista (KDS):** [http://localhost:3000/barista](http://localhost:3000/barista)
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
npx prisma migrate dev
npm run start:dev
```
*(Hệ thống hỗ trợ tự động Fallback sang dữ liệu In-memory nếu chưa kết nối cơ sở dữ liệu).*

#### 3. Cài đặt và Khởi chạy Frontend (Port 3000)
Mở một cửa sổ Terminal mới:
```bash
cd frontend
npm install
npm run dev
```

---

## Chạy Kiểm thử Tự động (Unit Tests)

Chạy bộ kiểm thử Jest kiểm tra toàn bộ luồng máy trạng thái, kiểm soát tương tranh và chống trùng lặp giao dịch:

```bash
cd backend
npm test
```

---

## Tài khoản Seed sẵn dùng thử (Demo Accounts)

Hệ thống đã chuẩn bị sẵn các tài khoản demo (dùng được cả trên PostgreSQL lẫn chế độ Offline In-Memory):

| Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Họ tên hiển thị | Điểm Loyalty |
|:---|:---|:---:|:---|:---:|
| **Người dùng / Khách hàng** | `user@brewlite.vn` | `123456` | Nguyễn Văn A (Khách hàng) | 50 điểm |
| **Quản trị viên (Admin)** | `admin@brewlite.vn` | `123456` | Quản Trị Viên BrewLite (Admin) | 100 điểm |
| **Nhân viên Quầy Pha chế** | `barista@brewlite.vn` | `123456` | Nhân Viên Pha Chế (Barista) | 0 điểm |

---

## Danh mục Endpoint API chính

| Phương thức | Endpoint | Chức năng | Xác thực JWT |
|:---:|:---|:---|:---:|
| `POST` | `/auth/register` | Đăng ký tài khoản người dùng | Không |
| `POST` | `/auth/login` | Đăng nhập và nhận JWT Token | Không |
| `GET` | `/products` | Danh sách menu đồ uống | Không |
| `GET` | `/products/:id` | Chi tiết một món nước | Không |
| `POST` | `/orders` | Tạo đơn hàng mới | **Có** |
| `GET` | `/orders/me` | Lấy lịch sử đơn hàng của người dùng | **Có** |
| `GET` | `/orders/:id` | Xem chi tiết đơn hàng | **Có** |
| `POST` | `/orders/:id/cancel` | Hủy đơn hàng và hoàn trả tồn kho | **Có** |
| `PATCH` | `/orders/:id/status` | Cập nhật trạng thái đơn (Barista KDS) | **Có (Barista/Admin)** |
| `GET` | `/orders/barista/queue` | Lấy hàng đợi quầy pha chế KDS | **Có (Barista/Admin)** |
| `GET` | `/auth/baristas` | Lấy danh sách tài khoản Barista | **Có (Admin)** |
| `POST` | `/auth/baristas` | Quản lý tạo tài khoản Barista mới | **Có (Admin)** |
| `DELETE` | `/auth/baristas/:id` | Quản lý xóa tài khoản Barista | **Có (Admin)** |
| `POST` | `/payments` | Thanh toán đơn hàng không tiền mặt | **Có** |
