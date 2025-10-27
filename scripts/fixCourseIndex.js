// fixCourseIndex.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        console.log('Đang kết nối tới MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit_registration');
        console.log('Kết nối MongoDB thành công.');

        const courseCollection = mongoose.connection.collection('courses');
        
        console.log('Đang kiểm tra các chỉ mục (indexes) của collection "courses"...');
        const indexes = await courseCollection.indexes();
        
        const oldIndexName = 'courseCode_1';
        const indexExists = indexes.some(index => index.name === oldIndexName);

        if (indexExists) {
            console.log(`Phát hiện chỉ mục cũ "${oldIndexName}". Đang tiến hành xóa...`);
            await courseCollection.dropIndex(oldIndexName);
            console.log(`Đã xóa thành công chỉ mục "${oldIndexName}".`);
        } else {
            console.log(`Không tìm thấy chỉ mục cũ "${oldIndexName}". Không cần thực hiện gì thêm.`);
        }

    } catch (error) {
        console.error('Đã xảy ra lỗi:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Đã ngắt kết nối MongoDB.');
    }
};

run();
