// clearAndSeedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Tải các biến môi trường từ file .env
dotenv.config();

// Giả định bạn có một User model và hàm kết nối DB như sau:
// Vui lòng điều chỉnh đường dẫn nếu cần thiết
const User = require('./models/User'); 

const clearData = async () => {
    try {
        const collections = await mongoose.connection.db.collections();
        console.log('Đang xóa dữ liệu cũ...');
        for (const collection of collections) {
            // Không xóa collection 'system.views' nếu có
            if (collection.collectionName.startsWith('system.')) {
                continue;
            }
            await collection.deleteMany({});
            console.log(`Đã xóa collection: ${collection.collectionName}`);
        }
        console.log('Xóa dữ liệu thành công.');
    } catch (error) {
        console.error('Lỗi khi xóa dữ liệu:', error);
        process.exit(1);
    }
};

const seedAdmin = async () => {
    try {
        console.log('Đang tạo tài khoản admin mặc định...');

        const adminExists = await User.findOne({ email: 'admin@example.com' });

        if (adminExists) {
            console.log('Tài khoản admin đã tồn tại. Bỏ qua việc tạo mới.');
            return;
        }

        const adminUser = new User({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
            password: '123456', // Cung cấp mật khẩu dạng thô, model sẽ tự động mã hóa
            role: 'admin',
            isActive: true, // Đảm bảo tài khoản được kích hoạt
            // Các trường khác có thể để trống hoặc giá trị mặc định
        });

        await adminUser.save();
        console.log('Tài khoản admin mặc định đã được tạo thành công!');
        console.log('------------------------------------------');
        console.log('Email: admin@example.com');
        console.log('Mật khẩu: 123456');
        console.log('------------------------------------------');

    } catch (error) {
        console.error('Lỗi khi tạo tài khoản admin:', error);
        process.exit(1);
    }
};

const run = async () => {
    // Kết nối trực tiếp với MongoDB, sử dụng biến môi trường MONGODB_URI
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit_registration')
        .then(() => console.log('MongoDB connected successfully for seeding script'))
        .catch(err => { console.error('MongoDB connection error for seeding script:', err); process.exit(1); });
    await clearData();
    await seedAdmin();
    mongoose.disconnect();
    console.log('Đã ngắt kết nối MongoDB.');
};

run();
