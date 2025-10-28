# Hướng dẫn Cài đặt và Vận hành Hệ thống Đăng ký Tín chỉ

Đây là tài liệu hướng dẫn chi tiết các bước để cài đặt và chạy ứng dụng Quản lý Đăng ký Tín chỉ trên môi trường local.

## Tính năng chính

### Cho Sinh viên:
- Đăng ký và hủy đăng ký học phần.
- Xem lịch học, lịch thi chi tiết.
- Theo dõi tiến độ học tập và điểm số.
- Quản lý thông tin hồ sơ cá nhân.

### Cho Giảng viên:
- Quản lý các lớp học phần được phân công.
- Nhập và cập nhật điểm cho sinh viên.
- Duyệt các yêu cầu đăng ký học phần của sinh viên.

### Cho Quản trị viên:
- Quản lý toàn diện tài khoản người dùng (Sinh viên, Giảng viên, Admin).
- Quản lý chương trình đào tạo, môn học, lớp học phần.
- Cấu hình và quản lý các học kỳ trong năm.
- Theo dõi và thống kê hoạt động của toàn hệ thống.

## Công nghệ sử dụng

### Backend:
- Node.js + Express.js
- MongoDB + Mongoose
- Xác thực bằng JWT (JSON Web Token)

### Frontend:
- React.js 18
- React Router DOM
- Tailwind CSS
- Axios (HTTP client)
- Lucide React (icons)
- React Hook Form & React Hot Toast

## Hướng dẫn Cài đặt

### Bước 1: Yêu cầu môi trường
- **Node.js**: Phiên bản `16.x` trở lên.
- **npm** hoặc **yarn**: Trình quản lý gói cho Node.js.
- **MongoDB Community Server**: Hệ quản trị cơ sở dữ liệu.
- **MongoDB Compass**: Công cụ giao diện đồ họa để quản lý MongoDB (khuyến khích).

### Bước 2: Tải mã nguồn

```bash
# Clone repository
git clone [URL_REPOSITORY_CỦA_BẠN]
cd phantichthietkephanmem
```

### Bước 2: Cấu hình môi trường

1. Tạo file `.env` trong thư mục gốc (hoặc copy từ `config.env`):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/credit_registration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
FRONTEND_URL=http://localhost:3000
```

2. Cập nhật các giá trị phù hợp với môi trường của bạn

### Bước 3: Khởi động MongoDB

```bash
# Khởi động MongoDB service
mongod

# Hoặc sử dụng Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Bước 4: Chạy ứng dụng

#### Chạy Backend:
```bash
# Chạy ở chế độ development (với nodemon)
npm run dev

# Hoặc chạy production
npm start
```

#### Chạy Frontend:
```bash
# Mở terminal mới
cd client
npm start
```

Ứng dụng sẽ chạy tại:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

## Cấu trúc dự án

```
phanmem/
├── server.js                 # Entry point của backend
├── package.json             # Backend dependencies
├── config.env               # Biến môi trường
├── models/                  # MongoDB models
│   ├── User.js             # Model người dùng
│   ├── Course.js           # Model khóa học
│   ├── Registration.js     # Model đăng ký
│   └── Semester.js         # Model học kỳ
├── routes/                  # API routes
│   ├── auth.js             # Xác thực
│   ├── users.js            # Quản lý người dùng
│   ├── courses.js          # Quản lý khóa học
│   ├── registrations.js    # Quản lý đăng ký
│   └── semesters.js        # Quản lý học kỳ
├── middleware/              # Middleware
│   └── auth.js             # JWT authentication
├── client/                  # React frontend
│   ├── public/             # Static files
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── App.js          # Main app component
│   ├── package.json        # Frontend dependencies
│   └── tailwind.config.js  # Tailwind CSS config
└── README.md               # Hướng dẫn này
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `POST /api/auth/change-password` - Đổi mật khẩu

### Users
- `GET /api/users` - Lấy danh sách users (Admin)
- `GET /api/users/profile` - Lấy profile user hiện tại
- `PUT /api/users/profile` - Cập nhật profile
- `GET /api/users/students` - Lấy danh sách sinh viên

### Courses
- `GET /api/courses` - Lấy danh sách khóa học
- `GET /api/courses/:id` - Lấy chi tiết khóa học
- `POST /api/courses` - Tạo khóa học mới (Admin/Teacher)
- `PUT /api/courses/:id` - Cập nhật khóa học

### Registrations
- `GET /api/registrations` - Lấy danh sách đăng ký
- `POST /api/registrations` - Đăng ký môn học (Student)
- `PUT /api/registrations/:id/approve` - Duyệt đăng ký
- `PUT /api/registrations/:id/drop` - Xóa môn học

## Tài khoản mặc định

Sau khi chạy lần đầu, bạn cần tạo tài khoản admin thông qua API:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

## Tính năng nâng cao

- **Email notifications**: Gửi email thông báo đăng ký, điểm số
- **File upload**: Upload tài liệu khóa học
- **Real-time updates**: WebSocket cho thông báo real-time
- **Mobile responsive**: Giao diện tối ưu cho mobile
- **Export data**: Xuất báo cáo Excel/PDF
- **Advanced search**: Tìm kiếm nâng cao với filters

## Bảo mật

- JWT token authentication
- Password hashing với bcrypt
- Input validation và sanitization
- Rate limiting
- CORS configuration
- Helmet security headers

## Deployment

### Production:
1. Cập nhật biến môi trường
2. Build frontend: `cd client && npm run build`
3. Sử dụng PM2 hoặc Docker để chạy backend
4. Cấu hình reverse proxy (Nginx)

### Docker:
```bash
# Build và chạy với Docker Compose
docker-compose up -d
```

## Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## License

MIT License - xem file LICENSE để biết thêm chi tiết.

## Hỗ trợ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub repository.

## Tác giả

[Your Name] - [Your Email]

---

**Lưu ý**: Đây là phiên bản development. Trước khi deploy production, hãy cập nhật các cài đặt bảo mật và biến môi trường phù hợp. 