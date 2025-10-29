# Hệ thống Quản lý Đăng ký Tín chỉ

[![React](https://img.shields.io/badge/React-18.2.0-blue?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16.x-green?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.2-lightgrey?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-blue?logo=tailwind-css)](https://tailwindcss.com/)

Một ứng dụng web hiện đại giúp quản lý quy trình đăng ký học phần theo hệ thống tín chỉ cho sinh viên, giảng viên và quản trị viên.

## 📖 Mục lục

- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Hướng dẫn Cài đặt](#-hướng-dẫn-cài-đặt)
  - [Bước 1: Yêu cầu môi trường](#bước-1-yêu-cầu-môi-trường)
  - [Bước 2: Tải mã nguồn và Cài đặt](#bước-2-tải-mã-nguồn-và-cài-đặt)
  - [Bước 3: Cấu hình Biến môi trường](#bước-3-cấu-hình-biến-môi-trường)
  - [Bước 4: Cấu hình Database và Khởi tạo dữ liệu](#bước-4-cấu-hình-database-và-khởi-tạo-dữ-liệu)
  - [Bước 5: Khởi chạy ứng dụng](#bước-5-khởi-chạy-ứng-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [API Endpoints](#-api-endpoints)
- [Đóng góp](#-đóng-góp)
- [License](#-license)

## ✨ Tính năng chính

### 👨‍🎓 Dành cho Sinh viên
- Đăng ký và hủy đăng ký học phần.
- Xem lịch học, lịch thi chi tiết.
- Theo dõi tiến độ học tập và điểm số.
- Quản lý thông tin hồ sơ cá nhân.

### 👨‍🏫 Dành cho Giảng viên
- Quản lý các lớp học phần được phân công.
- Nhập và cập nhật điểm cho sinh viên.
- Duyệt các yêu cầu đăng ký học phần của sinh viên.

### ⚙️ Dành cho Quản trị viên
- Quản lý toàn diện tài khoản người dùng (Sinh viên, Giảng viên, Admin).
- Quản lý chương trình đào tạo, môn học, lớp học phần.
- Cấu hình và quản lý các học kỳ trong năm.
- Theo dõi và thống kê hoạt động của toàn hệ thống.

## 🛠️ Công nghệ sử dụng

| Phần      | Công nghệ                                                              |
| :--------- | :--------------------------------------------------------------------- |
| **Backend**  | Node.js, Express.js, MongoDB, Mongoose, JWT, Bcrypt                  |
| **Frontend** | React.js, React Router, Tailwind CSS, Axios, React Hook Form, Lucide |

## 🚀 Hướng dẫn Cài đặt

### Bước 1: Yêu cầu môi trường
- **Node.js**: Phiên bản `16.x` trở lên.
- **npm** hoặc **yarn**: Trình quản lý gói cho Node.js.
- **MongoDB Community Server**: Hệ quản trị cơ sở dữ liệu.
- **MongoDB Compass**: Công cụ giao diện đồ họa để quản lý MongoDB (khuyến khích).

### Bước 2: Tải mã nguồn và Cài đặt

```bash
# Clone repository
git clone [URL_REPOSITORY_CỦA_BẠN]
cd phantichthietkephanmem

# Xóa toàn bộ dữ liệu cũ và seed tài khoản mặc định cho admin. Chạy lệnh dưới đây ở phần backend
npm run seed  

#tải xuống và cài đặt hai gói csv-parser và multer(import từ tệp csv hoặc notepad)

npm install csv-parser multer

# cài đặt để băm mật khẩu
npm install bcryptjs

# Cài đặt dependencies cho Backend
npm install

# Khởi động backend
npm run dev

# Cài đặt dependencies cho Frontend
cd client
npm install

# Khơi động chương trình( khởi đọng frontend)
npm start
