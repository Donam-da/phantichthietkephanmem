const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('../models/User'); // Đảm bảo đường dẫn đến model User là chính xác

// Nạp tất cả các model để Mongoose nhận diện được tất cả các collection
require('../models/School');
require('../models/Subject');
require('../models/Classroom');
require('../models/Semester');
require('../models/Course');
require('../models/Registration');
require('../models/ChangeRequest');
require('../models/ActivityLog');

// --- GIẢI PHÁP TRIỆT ĐỂ: Đọc trực tiếp file .env ---
const envPath = path.resolve(__dirname, '..', 'config.env');
try {
    const envFileContent = fs.readFileSync(envPath, 'utf8');
    envFileContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
            process.env[key.trim().replace(/"/g, '')] = value.replace(/"/g, '');
        }
    });
    console.log('Successfully loaded environment variables from config.env file.');
} catch (error) {
    console.error('Could not read config.env file. Please ensure it exists in the root directory.', error);
    process.exit(1);
}

const connectDB = async () => {
    try {
        // Sử dụng MONGODB_URI thay vì MONGO_URI để khớp với file .env của bạn
        const conn = await mongoose.connect(process.env.MONGODB_URI || '', {
            // Các tùy chọn này không còn cần thiết trong Mongoose v6+ nhưng không gây hại
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error connecting to DB: ${err.message}`);
        process.exit(1);
    }
};

const clearAllData = async () => {
    try {
        const collections = await mongoose.connection.db.collections();
        console.log('Starting to clear all collections...');

        for (const collection of collections) {
            // Bỏ qua các collection hệ thống của MongoDB
            if (collection.collectionName.startsWith('system.')) {
                continue;
            }
            await collection.deleteMany({});
            console.log(`  - Cleared collection: ${collection.collectionName}`);
        }
        console.log('\nAll collections have been cleared successfully.');
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

const seedAdmin = async () => {
    try {
        const adminUser = new User({
            firstName: 'Admin',
            lastName: 'Account',
            email: 'admin@example.com',
            password: 'password123', // Mật khẩu sẽ được hash tự động bởi pre-save hook trong User model
            role: 'admin',
            isActive: true,
        });

        await adminUser.save();
        console.log('\nAdmin user created successfully!');
        console.log('  Email: admin@example.com');
        console.log('  Password: password123');

    } catch (error) {
        console.error('Error seeding admin user:', error);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    await clearAllData();
    await seedAdmin();
    console.log('\nSeeding process finished. Disconnected from DB.');
    mongoose.disconnect();
};

run();