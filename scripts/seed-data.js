const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Course = require('../models/Course');
const Registration = require('../models/Registration');
const Semester = require('../models/Semester');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/credit_registration');
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        console.log('🌱 Seeding database with sample data...\n');

        // Xóa dữ liệu cũ (nếu muốn reset)
        await User.deleteMany({});
        await Course.deleteMany({});
        await Semester.deleteMany({});
        await Registration.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // 1. Tạo Semester
        let semester = await Semester.findOne({ code: 'HK1_2024_2025' });
        if (!semester) {
            semester = new Semester({
                name: 'Học kỳ 2 năm 2025-2026',
                code: 'HK2_2025_2026',
                academicYear: '2025-2026',
                semesterNumber: 2,
                startDate: new Date('2025-12-01'),
                endDate: new Date('2026-02-01'),
                registrationStartDate: new Date('2025-11-20'),
                registrationEndDate: new Date('2025-11-26'),
                withdrawalDeadline: new Date('2025-11-28'),
                isActive: true,
                isCurrent: true,
                maxCreditsPerStudent: 16,
                minCreditsPerStudent: 8
            });
            await semester.save();
            console.log('✅ Created semester: HK2_2025_2026');
        }

        // 2. Tạo Users
        const users = [
            {
                firstName: 'Vũ',
                lastName: 'Quang Dũng',
                email: 'admin@university.edu',
                password: 'admin123',
                role: 'admin'
            },
            {
                firstName: 'Nguyễn',
                lastName: 'Xuân Quế',
                email: 'teacher@university.edu',
                password: 'teacher123',
                role: 'teacher'
            },
            {
                firstName: 'Đỗ',
                lastName: 'Hoài Nam',
                email: 'student@university.edu',
                password: 'student123',
                role: 'student',
                major: 'Công nghệ thông tin',
                year: 3,
                semester: 5,
                gpa: 3.2,
                currentCredits: 0,
                maxCredits: 16
            },
            {
                firstName: 'Nguyễn',
                lastName: 'Văn Minh',
                email: 'student2@university.edu',
                password: 'student123',
                role: 'student',
                major: 'Công nghệ thông tin',
                year: 2,
                semester: 3,
                gpa: 3.5,
                currentCredits: 0,
                maxCredits: 16
            }
        ];

        // Phải tạo từng user để trigger middleware mã hóa mật khẩu
        for (const userData of users) {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                await User.create(userData);
                console.log(`✅ Created user: ${userData.email}`);
            }
        }

        // Lấy teacher để tạo courses
        const teacher = await User.findOne({ role: 'teacher' });
        if (!teacher) {
            console.log('❌ No teacher found');
            return;
        }

        // 3. Tạo Courses
        const courses = [
            {
                courseCode: 'IT101',
                courseName: 'Lập trình cơ bản',
                credits: 3,
                description: 'Khóa học lập trình cơ bản với Java',
                department: 'Công nghệ thông tin',
                major: 'Công nghệ thông tin',
                teacher: teacher._id,
                semester: semester._id,
                schedule: {
                    dayOfWeek: 2,
                    startTime: '08:00',
                    endTime: '10:00',
                    room: 'A2-204'
                },
                maxStudents: 30,
                registrationDeadline: new Date('2025-11-26'),
                withdrawalDeadline: new Date('2025-11-28'),
                isActive: true,
                courseType: 'mandatory',
                yearLevel: 1,
                semesterNumber: 2
            },
            {
                courseCode: 'IT102',
                courseName: 'Cấu trúc dữ liệu',
                credits: 3,
                description: 'Học về các cấu trúc dữ liệu cơ bản',
                department: 'Công nghệ thông tin',
                major: 'Công nghệ thông tin',
                teacher: teacher._id,
                semester: semester._id,
                schedule: {
                    dayOfWeek: 3,
                    startTime: '10:00',
                    endTime: '12:00',
                    room: 'A6-301'
                },
                maxStudents: 25,
                registrationDeadline: new Date('2025-11-26'),
                withdrawalDeadline: new Date('2025-11-28'),
                isActive: true,
                courseType: 'mandatory',
                yearLevel: 2,
                semesterNumber: 2
            },
            {
                courseCode: 'IT201',
                courseName: 'Cơ sở dữ liệu',
                credits: 4,
                description: 'Thiết kế và quản lý cơ sở dữ liệu',
                department: 'Công nghệ thông tin',
                major: 'Công nghệ thông tin',
                teacher: teacher._id,
                semester: semester._id,
                schedule: {
                    dayOfWeek: 4,
                    startTime: '14:00',
                    endTime: '17:00',
                    room: 'A6-405'
                },
                maxStudents: 20,
                registrationDeadline: new Date('2025-11-26'),
                withdrawalDeadline: new Date('2025-11-28'),
                isActive: true,
                courseType: 'elective',
                yearLevel: 2,
                semesterNumber: 2
            }
        ];

        try {
            await Course.insertMany(courses, { ordered: false });
            console.log(`✅ Inserted ${courses.length} courses (skipping duplicates).`);
        } catch (error) {
            if (error.code !== 11000) {
                console.error('Error inserting courses:', error);
            }
        }

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📋 Login credentials:');
        console.log('👨‍💼 Admin: admin@university.edu / admin123');
        console.log('👨‍🏫 Teacher: teacher@university.edu / teacher123');
        console.log('👨‍🎓 Student: student@university.edu / student123');
        console.log('👨‍🎓 Student 2: student2@university.edu / student123');

    } catch (error) {
        console.error('❌ Error seeding data:', error.message);
    }
};

const main = async () => {
    await connectDB();
    await seedData();
    mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
};

main().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
});
