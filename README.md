# BrewLite - Cashless Coffee Ordering System

Hệ thống đặt đồ uống không dùng tiền mặt (Bài tập lớn môn Công nghệ Phần mềm - Trường Đại học Sài Gòn SGU).

## 1. Công nghệ sử dụng
- **Frontend**: Next.js (TypeScript, TailwindCSS, Zustand) - Cổng 3000
- **Backend**: NestJS (TypeScript, Prisma ORM, JWT, Bcrypt) - Cổng 3001
- **Cơ sở dữ liệu**: PostgreSQL 16 - Cổng 5432
- **Đóng gói**: Docker & Docker Compose

## 2. Cách khởi chạy nhanh với Docker Compose (Khuyến nghị)

Chạy đồng thời cả 3 dịch vụ (Database, Backend API, Frontend Web):
```bash
docker compose up --build
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3001](http://localhost:3001)

Dừng hệ thống:
```bash
docker compose down
```

## 3. Cách khởi chạy cục bộ thủ công (Local Development)

### Bước 1: Khởi động cơ sở dữ liệu PostgreSQL
```bash
docker compose up -d db
```

### Bước 2: Khởi động Backend (Port 3001)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed  # Nạp dữ liệu menu mẫu nếu có
npm run start:dev
```

### Bước 3: Khởi động Frontend (Port 3000)
Mở cửa sổ terminal mới:
```bash
cd frontend
npm install
npm run dev
```

## 4. Các chức năng đã hoàn thành (Task 1 đến Task 9)
- **Task 1**: Cấu trúc Monorepo (`frontend` + `backend`), Git, README, `.env.example`.
- **Task 2**: API danh mục sản phẩm `GET /products` và chi tiết `GET /products/:id` qua Prisma.
- **Task 3**: Trang Menu trên Next.js hiển thị lưới sản phẩm, mobile-first, loading skeleton, empty state.
- **Task 4**: Màn hình chi tiết sản phẩm, chọn kích thước (Size S/M/L), chọn Topping, tính giá động.
- **Task 5**: Giỏ hàng trực tuyến bằng Zustand store: thêm, sửa số lượng, xóa, tính tổng tiền, badge số lượng.
- **Task 6**: API tạo đơn hàng `POST /orders`, xác thực DTO bằng `class-validator`, lưu trạng thái `PENDING`.
- **Task 7**: Đăng ký `POST /auth/register`, đăng nhập `POST /auth/login`, băm mật khẩu `bcrypt`, cấp mã `JWT` và bảo vệ route bằng `JwtAuthGuard`.
- **Task 8**: Thanh toán không dùng tiền mặt `POST /payments` (Mock payment): chọn Ví điện tử hoặc Thẻ ngân hàng, cập nhật đơn hàng thành `PAID` (thành công) hoặc `PAYMENT_FAILED` (thất bại).
- **Task 9**:
  - Màn hình xác nhận đơn hàng (`/orders/[id]/confirmation`): hiển thị mã đơn hàng, trạng thái `PAID`, hướng dẫn nhận đồ uống tại quầy.
  - API `GET /orders/me` và màn hình lịch sử đơn hàng (`/orders`) cho phép xem lại các đơn đã đặt và thử thanh toán lại.
  - File `docker-compose.yml` và `Dockerfile` đóng gói hoàn chỉnh 3 thành phần: Frontend, Backend và Database.
