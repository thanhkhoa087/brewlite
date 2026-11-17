# Tài Liệu Thiết Kế Kiến Trúc Hệ Thống BrewLite (C4 & Layered Architecture)

## 1. Phương pháp tiếp cận kiến trúc (Architectural Approach)
BrewLite áp dụng mô hình kiến trúc phân tầng kết hợp hướng Module/Domain (Modular Monolith) trong cấu trúc Monorepo thống nhất. Phương pháp này cân bằng hoàn hảo giữa tính độc lập triển khai, tốc độ phát triển trong giai đoạn startup/MVP và khả năng mở rộng (scalability) khi lưu lượng người dùng tăng cao.

### 1.1. Kiến trúc C4 - Mức 1: Context Diagram (Bối cảnh hệ thống)
- **Người dùng:** Khách hàng sử dụng thiết bị di động truy cập Web PWA để duyệt món, tùy biến và đặt hàng. Nhân viên quầy và Quản lý truy cập dashboard để vận hành.
- **Hệ thống BrewLite:** Hệ thống lõi cung cấp dịch vụ đặt món, quản lý menu, xử lý giao dịch.
- **Hệ thống ngoại vi:**
  - Mock Payment Gateway: Cung cấp API mô phỏng thanh toán ví MoMo/Thẻ với cơ chế callback và webhook.
  - Cloudflare / Vercel Edge: Cung cấp CDN và giải quyết chứng chỉ SSL/TLS.

### 1.2. Kiến trúc C4 - Mức 2: Container Diagram (Các thành phần thực thi)
1. **Frontend Web App (`apps/web`):** Xây dựng trên nền tảng **Next.js 14+ (React, TypeScript)**. Hoạt động theo mô hình Mobile-First PWA, hỗ trợ Server-Side Rendering (SSR) kết hợp Client-Side Hydration, tối ưu hóa tốc độ tải trang bước đầu.
2. **Backend API Core (`apps/api`):** Xây dựng trên framework **NestJS (Node.js, TypeScript)**. Cung cấp chuẩn RESTful API, quản lý logic nghiệp vụ, bảo vệ tài nguyên qua JWT Guards và DTO Validation Pipes.
3. **Cơ sở dữ liệu (`Database`):** Hệ quản trị CSDL quan hệ **PostgreSQL 16**. Sử dụng **Prisma ORM** để quản trị schema, tự động hóa migration và sinh type-safe query client.
4. **Mock Payment Service:** Sub-module xử lý giả lập thanh toán, đảm bảo tính bất biến (Idempotency) dựa trên khóa giao dịch.

### 1.3. Phân tầng Backend (NestJS Layered Structure)
Mỗi module domain trong `apps/api` tuân thủ nguyên lý Dependency Injection và Separation of Concerns:
- **Controller Layer:** Tiếp nhận HTTP Request, routing, áp dụng DTO Validation Pipe, JWT Guard và trả về HTTP Response.
- **Service / Domain Layer:** Chứa toàn bộ nghiệp vụ (tính toán giỏ hàng, kiểm tra số dư, cập nhật tồn kho, xử lý idempotency).
- **Data Access Layer (Repository / Prisma Service):** Thực thi truy vấn CSDL, kiểm soát Database Transaction (`$transaction`), đảm bảo ACID.

---

## 2. Các quyết định kỹ thuật then chốt (Architectural Decisions & Trade-offs)

### 2.1. Frontend Next.js Mobile-First / PWA
- **Lý do chọn:** Next.js cung cấp SSR/SSG giúp tối ưu điểm SEO và tăng tốc thời gian hiển thị First Contentful Paint (< 1.8s). Chuẩn PWA cho phép người dùng "Add to Home Screen" trên iOS/Android để sử dụng như Native App mà không tốn chi phí phát hành lên App Store/Google Play.
- **Trade-off:** Cần quản lý đồng bộ state hydration giữa server và client.

### 2.2. Backend NestJS Modular Monolith
- **Lý do chọn:** NestJS cung cấp cấu trúc kiến trúc chuẩn hóa (Modules, Providers, Controllers), tích hợp sẵn TypeScript, dễ dàng bảo trì và viết kiểm thử (Jest). Lối thiết kế Modular Monolith tránh được sự phức tạp về hạ tầng mạng của Microservices nhưng vẫn dễ dàng tách nhỏ thành microservices sau này nếu cần.
- **Trade-off:** Tốn tài nguyên khởi động hơn ExpressJS thuần một lượng không đáng kể.

### 2.3. PostgreSQL kết hợp Prisma ORM
- **Lý do chọn:** Dữ liệu bán hàng và thanh toán yêu cầu tính toàn vẹn (ACID) cao độ. PostgreSQL hỗ trợ tốt Transaction và Row-Level Locking chống race condition. Prisma ORM mang lại trải nghiệm Developer Experience xuất sắc nhờ tính an toàn kiểu dữ liệu (type-safe) và cơ chế migration tự động `prisma migrate dev`.
- **Trade-off:** Tốc độ ghi bulk data chậm hơn NoSQL (MongoDB), tuy nhiên hoàn toàn đáp ứng tốt lưu lượng của chuỗi cửa hàng đồ uống.

### 2.4. Logging, Health Check & Cấu hình môi trường
- **Logging:** Sử dụng NestJS Logger tích hợp ghi log chuẩn có timestamp, context và log-level (INFO, WARN, ERROR).
- **Health Check:** Endpoint `GET /health` kiểm tra trạng thái hoạt động của API và kết nối CSDL, trả về JSON status và uptime phục vụ tự động giám sát.
- **Cấu hình:** Sử dụng `@nestjs/config` và thư viện `dotenv`, nạp biến môi trường từ `.env` với validation nghiêm ngặt.
