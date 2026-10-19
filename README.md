# BÀI QUẨY — CARDVERSE

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/lmt1102011/cardverse)

Web game đánh bài online nhiều người chơi theo thời gian thực. Giao diện hiện đại, hệ thống phòng chơi, chip ảo, luật chơi Việt Nam và hệ thống Magic Card độc đáo.

## Công nghệ

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Socket.IO Client |
| Backend | Node.js, TypeScript, Fastify, Socket.IO |
| Chia sẻ | packages/shared (types, game rules, Magic Card definitions) |
| Database | PostgreSQL + Prisma (tùy chọn) |

## Cấu trúc dự án

```
cardverse/
├── apps/
│   ├── web/                  # Frontend React
│   │   └── src/
│   │       ├── app/          # App component, routing
│   │       ├── features/
│   │       │   ├── lobby/    # Trang chủ, carousel chế độ
│   │       │   ├── rooms/    # Danh sách phòng, tạo phòng
│   │       │   └── table/    # Bàn chơi, cược, Magic Card
│   │       ├── components/   # PlayingCard, MagicCard
│   │       ├── stores/       # Zustand store
│   │       └── services/     # Socket.IO client
│   └── server/               # Backend Fastify + Socket.IO
│       └── src/
│           ├── modules/games/ # GameManager (phòng, ván bài, settlement)
│           └── websocket/     # Socket.IO handlers
├── packages/
│   └── shared/               # Types, game rules, Magic Card defs
│       └── src/game-rules/   # Blackjack VN, Bài Cào VN + tests
├── prisma/                   # Schema database (tùy chọn)
├── docker-compose.yml        # PostgreSQL + Redis
└── .env.example
```

## Cài đặt và chạy

### Yêu cầu
- Node.js 18+
- npm 9+

### Khởi chạy local

```bash
# 1. Cài dependencies
npm install

# 2. Build shared package
npm run build -w @cardverse/shared

# 3. Chạy dev (frontend + backend đồng thời)
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

### Chạy riêng lẻ

```bash
# Backend
npm run dev -w @cardverse/server

# Frontend
npm run dev -w @cardverse/web
```

### Build production

```bash
npm run build
```

### Triển khai (deploy)

Có 2 cách. **Cách A (khuyến nghị)** deploy cả web + backend trên Render chỉ với 1 click, tự nối sẵn — cho ra 1 link chạy được ngay.

#### Cách A — Render Blueprint (khuyến nghị, 1 click, tự nối backend)

1. Vào https://render.com → đăng nhập bằng GitHub → **New** → **Blueprint**.
2. Chọn repo `lmt1102011/cardverse`. Render đọc `render.yaml` và tạo:
   - `cardverse-server` — backend Node (Fastify + Socket.IO), free tier.
   - `cardverse-web` — frontend static, tự build với `VITE_SERVER_URL` trỏ vào backend.
4. Bấm **Apply** và chờ 2 service deploy xong. Web chạy tại:
   **https://cardverse-web.onrender.com**

> Free tier "ngủ" sau ~15 phút không dùng; lần mở đầu có thể chậm ~30–50s.

#### Cách 2: Frontend lên GitHub Pages (đã bật sẵn)

Workflow `.github/workflows/deploy-web.yml` tự build và publish lên:
**https://lmt1102011.github.io/cardverse/**

Nhưng Pages là tĩnh, cần backend riêng. Nếu dùng cách này:
1. Deploy backend: Render → **New → Blueprint** (hoặc chỉ tạo service `cardverse-server`).
2. Repo → **Settings → Secrets and variables → Actions → Variables → New variable**:
   - Name: `VITE_SERVER_URL`, Value: URL backend (vd `https://cardverse-server.onrender.com`)
3. Đảm bảo `CORS_ORIGIN` của backend có `https://lmt1102011.github.io`.
4. Chạy lại workflow **Deploy web to GitHub Pages**.

#### Chạy backend bằng Docker (tùy chọn)

```bash
docker build -t cardverse-server .
docker run -p 3001:3001 -e CORS_ORIGIN=http://localhost:5173 cardverse-server
```

### Kiểm thử

```bash
# Toàn bộ test (shared + server) và typecheck
npm test
npm run typecheck

# Riêng từng workspace
npm test -w @cardverse/shared   # luật chơi, Magic Card, settlement
npm test -w @cardverse/server   # GameManager + luồng Socket.IO end-to-end
```

## Tính năng đã triển khai

### Game modes
- [x] **Xì Dách Việt Nam** — Luật VN: A=1/11, J/Q/K=10, Xì Dách, quắc, rút/dừng
- [x] **Bài Cào Việt Nam** — 3 lá, tính điểm hàng đơn vị, 0-9 điểm

### Phòng chơi
- [x] Tạo phòng (công khai/riêng tư, tối đa 8 người, mức cược)
- [x] Danh sách phòng real-time (Socket.IO)
- [x] Tham gia phòng, phòng đầy, phòng đang chơi
- [x] Mã phòng 6 ký tự

### Bàn chơi
- [x] Bố cục 8 ghế quanh bàn oval
- [x] Xác định Nhà cái ngẫu nhiên
- [x] Đặt cược bằng chip (10/20/50/100)
- [x] Xác nhận cược, khóa cược
- [x] Chia bài, rút bài, dừng bài
- [x] Bài úp của đối thủ (server-authoritative)
- [x] Hiển thị điểm, Xì Dách, quắc
- [x] Thanh toán chip chính xác
- [x] Bảng kết quả, ván tiếp theo

### Magic Card (15 lá)
| Cấp | Lá phép | Hiệu ứng |
|-----|---------|-----------|
| Thường | Cho Liếc Xíu | Xem 1 lá bài úp của đối thủ |
| Thường | Bùa Đừng Quắc | Chống quắc 1 lần |
| Thường | Hên Chút Chút Đê | Hoàn 10% cược |
| Hiếm | Soi Nhà Người Ta | Xem tổng điểm đối thủ |
| Hiếm | Cấm Xài Đồ | Khóa Magic Card đối thủ |
| Hiếm | Áo Giáp Nhân Phẩm | Khiên bảo vệ 1 lần |
| Sử Thi | Đổi Bài Cho Đỡ Ngứa | Đổi 1 lá với đối thủ |
| Sử Thi | Quả Báo Tới Nhanh | Phản đòn phép tiêu cực |
| Sử Thi | Bịt Mắt Thần Bài | Gây nhiễu UI 5s |
| Huyền Thoại | Nhân Đôi Kèo Thơm | Nhân đôi tiền thắng |
| Huyền Thoại | Tráo Vận Mệnh | Đổi ngẫu nhiên 1 lá |
| Huyền Thoại | Phản Đòn Cực Gắt | Vô hiệu hóa phép |
| Dị Giới | Quay Xe 360 Độ | Hủy phép chưa giải quyết |
| Dị Giới | Thời Gian Quay Đầu | Hoàn tác thao tác phép |
| Dị Giới | Mắt Thần Biết Tuốt | Xem toàn bộ bài đối thủ |

- [x] 5 cấp độ hiếm (Thường → Dị Giới) với màu sắc riêng
- [x] 15 lá phép có minh họa SVG riêng
- [x] Chọn mục tiêu, chọn lá bài
- [x] Server kiểm tra điều kiện trước khi thực thi
- [x] Chống double-click, spam request
- [x] Nhận 2 lá khi bắt đầu ván đầu
- [x] Mỗi người chỉ dùng 1 phép chủ động/ván

## Giới hạn còn lại

- Database (PostgreSQL/Prisma) chưa kết nối — game chạy in-memory
- Chưa có tài khoản đăng nhập (chơi bằng nickname)
- Chưa có âm thanh
- Chưa có Playwright E2E tests
- Bài Cào chưa có biến thể Ba Tây/Sáp
- Chưa có lịch sử ván đấu

## Xử lý sự cố

| Lỗi | Nguyên nhân | Cách sửa |
|-----|------------|----------|
| `ERR_DLOPEN_FAILED` rollup | Native binary sai architecture | `npm install @rollup/rollup-win32-x64-msvc` |
| PostCSS BOM error | package.json có BOM | Xóa 3 byte đầu (EF BB BF) |
| `workspace:*` unsupported | npm 11 không hỗ trợ | Dùng `file:` thay thế |
| Server không kết nối | CORS hoặc port sai | Kiểm tra `.env` và `CORS_ORIGIN` |
