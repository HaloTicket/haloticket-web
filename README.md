# HaloTicket Web App

Ứng dụng web cho nền tảng bán vé sự kiện **HaloTicket**, dành cho khách hàng, ban tổ chức và quản trị viên.

## Công nghệ

- React 19, TypeScript, Vite
- Tailwind CSS 4
- Redux Toolkit, React Router
- Axios, STOMP (WebSocket)
- i18n song ngữ Việt và Anh
- Vitest cho kiểm thử

## Cấu trúc thư mục

```text
src/
├── components/   # Thành phần giao diện dùng chung
├── config/       # Cấu hình ứng dụng (API, Keycloak)
├── context/      # React context
├── features/     # Theo nghiệp vụ: admin, auth, ekyc, events, organizer, resale, tickets, user, common
├── hooks/        # Custom hook
├── i18n/         # Bản dịch tiếng Việt và tiếng Anh
├── layouts/      # Bố cục trang
├── routes/       # Định nghĩa route
├── services/     # Gọi API backend
├── store/        # Redux store
├── types/        # Kiểu TypeScript dùng chung
├── utils/        # Hàm tiện ích
└── validation/   # Quy tắc kiểm tra dữ liệu nhập
tests/            # Kiểm thử
design-system/    # Tài liệu hệ thống thiết kế
```

## Yêu cầu

- Node.js 20 trở lên
- Backend HaloTicket đang chạy (xem README của `haloticket-backend`)

## Cấu hình

Sao chép file mẫu rồi điền giá trị:

```bash
cp .env.example .env.local
```

| Biến | Ý nghĩa |
|---|---|
| `VITE_API_URL` | Địa chỉ API Gateway, ví dụ `http://localhost:8888/api` |
| `VITE_KEYCLOAK_URL` | Địa chỉ Keycloak, ví dụ `http://localhost:9080` |
| `VITE_KEYCLOAK_REALM` | Tên realm Keycloak |
| `VITE_KEYCLOAK_CLIENT_ID` | Client công khai của web (`haloticket-web`) |

Đăng nhập Google và đăng ký nhanh dùng client công khai `haloticket-web` của Keycloak với luồng Authorization Code và PKCE. Khóa bí mật của Google chỉ đặt trong `.env` của backend, không bao giờ đưa vào biến `VITE_*`.

## Chạy và build

```bash
npm install
npm run dev       # chạy chế độ phát triển (Vite)
npm run build     # kiểm tra kiểu và build bản production
npm run preview   # xem thử bản build
npm run lint      # kiểm tra ESLint
npm test          # chạy Vitest
```

Giao diện phát triển chạy tại `http://localhost:5173`.

## Ghi chú phát triển

- Mọi chuỗi hiển thị phải đi qua i18n, thêm khóa ở cả hai ngôn ngữ trong `src/i18n`.
- Gọi API tập trung trong `src/services`, không gọi trực tiếp từ component.
- Quy ước và hướng dẫn thêm cho công cụ AI nằm trong `CLAUDE.md`.
