# Tài Liệu Triển Khai Hệ Thống BrewLite (Deployment Guide)

## 1. Tổng quan Kiến trúc Môi trường Triển khai
Hệ thống BrewLite được thiết kế để triển khai linh hoạt trên các nền tảng PaaS/Cloud hiện đại (chẳng hạn như **Render, Railway, Vercel, Supabase**) hoặc triển khai trên máy chủ cá nhân thông qua **Docker & Docker Compose**.

### 1.1. Bảng phân vùng môi trường

| Thành phần | Môi trường Local Dev | Môi trường CI (GitHub Actions) | Môi trường Production (Cloud PaaS) |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | Next.js Dev Server (`localhost:3000`) | Headless Build & Lint Test | Cloudflare / Vercel Edge / PaaS Container |
| **Backend API** | NestJS Dev Server (`localhost:5000`) | In-memory Mock Test / Jest | Render Web Service (`https://api-brewlite.onrender.com`) |
| **Cơ sở dữ liệu** | PostgreSQL 16 (Docker Compose) | PostgreSQL Service Container | Managed PostgreSQL (Supabase / Render DB) |
| **Giao thức** | HTTP (`http://localhost:*`) | Internal Loopback | HTTPS / TLS 1.3 (Port 443) |
| **Bảo mật Secrets** | File `.env` cục bộ | GitHub Actions Secrets | PaaS Environment Variables Dashboard |

---

## 2. Thiết lập Biến môi trường (Environment Variables)

### 2.1. Backend (`apps/api/.env`)
```bash
# Cấu hình máy chủ
NODE_ENV=production
PORT=5000
API_PREFIX=api

# Kết nối cơ sở dữ liệu PostgreSQL
DATABASE_URL="postgresql://brewlite_user:SecurePass2026@dpg-xxxx.render.com:5432/brewlite_prod?sslmode=require"

# Khóa bí mật JWT
JWT_SECRET="brewlite_jwt_super_secret_key_2026_production"
JWT_EXPIRES_IN="7d"

# Cổng thanh toán mô phỏng
MOCK_PAYMENT_LATENCY_MS=400
IDEMPOTENCY_TTL_SECONDS=86400
```

### 2.2. Frontend (`apps/web/.env.production`)
```bash
# Đường dẫn API Backend
NEXT_PUBLIC_API_URL="https://api-brewlite.onrender.com/api"
NEXT_PUBLIC_APP_NAME="BrewLite"
NEXT_PUBLIC_ENABLE_PWA="true"
```

---

## 3. Giám sát & Health Check
- **Health Check Endpoint:** `GET /health`
- **Mẫu phản hồi HTTP 200 OK:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "uptime": 12845.32,
    "timestamp": "2026-10-31T11:55:00.000Z"
  }
}
```
- Nếu cơ sở dữ liệu ngắt kết nối, endpoint trả về mã `503 Service Unavailable`, báo hiệu cho Load Balancer hoặc Docker Swarm kích hoạt khởi động lại container hoặc kích hoạt kịch bản Rollback.

---

## 4. Quy trình Rollback khi Triển khai Thất bại (Rollback Procedure)
1. **Phát hiện lỗi:** Sau khi CD đẩy phiên bản mới, bước `Smoke Test` kiểm tra `GET /health` 3 lần liên tiếp. Nếu trả về mã lỗi $\ge 500$, pipeline lập tức kích hoạt trạng thái **FAILURE**.
2. **Kích hoạt Rollback tự động:**
   - Script CD sử dụng GitHub CLI / PaaS Deploy Hook để rollback lại commit SHA hoặc Docker Image tag ổn định liền trước đó (`brewlite-api:latest-stable`).
   - Lệnh kích hoạt rollback thông qua CLI:
     ```bash
     docker compose -f docker-compose.prod.yml rollback
     ```
3. **An toàn dữ liệu:** Do các migration database được thiết kế theo hướng tương thích ngược (Backward-compatible schema additions), việc rollback container ứng dụng không làm hỏng dữ liệu hiện hữu.
