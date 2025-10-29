const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs'); // Thêm dòng này để import bcryptjs
const User = require('../models/User');
const Course = require('../models/Course'); // Import Course model
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const Semester = require('../models/Semester'); // Import Semester model
const School = require('../models/School');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { logActivity } = require('../services/logService'); // Import logService
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');

const upload = multer({ dest: 'uploads/' });

// @route   POST api/users
// @desc    Tạo người dùng mới (chỉ admin)
// @access  Private (Admin)
router.post('/', [
    auth,
    admin,
    body('email', 'Vui lòng nhập email hợp lệ').isEmail(),
    body('password', 'Mật khẩu phải có ít nhất 6 ký tự').isLength({ min: 6 }),
    body('firstName', 'Họ là bắt buộc').not().isEmpty(),
    body('lastName', 'Tên là bắt buộc').not().isEmpty(),
    body('role', 'Vai trò là bắt buộc').isIn(['student', 'teacher', 'admin']),
    body('year', 'Năm học là bắt buộc và phải là số nguyên dương').if(body('role').equals('student')).isInt({ min: 1 }),
    body('semester', 'Học kỳ là bắt buộc và phải là số nguyên dương').if(body('role').equals('student')).isInt({ min: 1 }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, studentId, school } = req.body;
    const { teachingSchools, year, semester } = req.body; // Thêm year, semester
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Email đã được sử dụng' });
        }

        if (role === 'student' && studentId) {
            let existingStudent = await User.findOne({ studentId });
            if (existingStudent) {
                return res.status(400).json({ msg: 'Mã sinh viên đã tồn tại' });
            }
        }

        // Lấy maxCredits từ học kỳ được chọn khi tạo sinh viên
        let maxCreditsForStudent = 24; // Giá trị mặc định
        if (role === 'student' && semester) {
            const selectedSemester = await Semester.findOne({ semesterNumber: semester, academicYear: new Date().getFullYear() }); // Giả sử tìm theo năm hiện tại
            if (selectedSemester) maxCreditsForStudent = selectedSemester.maxCreditsPerStudent;
        }

        user = new User({
            email,
            password,
            firstName,
            lastName,
            role,
            studentId: role === 'student' ? studentId : undefined,
            school: role === 'student' ? school : undefined,
            year: role === 'student' ? year : undefined, // Thêm year cho sinh viên
            semester: role === 'student' ? semester : undefined, // Thêm semester cho sinh viên
            maxCredits: role === 'student' ? maxCreditsForStudent : undefined, // Gán maxCredits
            teachingSchools: role === 'teacher' ? teachingSchools : undefined, // NEW: Assign teachingSchools for teachers
        });

        await user.save();

        // Ghi log
        logActivity(req.user.id, 'CREATE_USER', {
            targetType: 'User',
            targetId: user._id,
            details: { message: `Admin created a new user: ${user.email} with role ${user.role}.` }
        });

        res.status(201).json({ msg: 'Tạo người dùng thành công' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/users
// @desc    Lấy tất cả người dùng
// @access  Private (Admin)
router.get('/', [auth, admin], async (req, res) => {
    try {
        const { role, populateSchools } = req.query;
        const query = {};
        if (role) {
            query.role = role;
        }

        // Sử dụng aggregation để đếm số lớp học phần được phân công cho giảng viên
        const aggregationPipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'courses', // Tên collection của Course model
                    localField: '_id',
                    foreignField: 'teacher',
                    as: 'assignedCourses'
                }
            },
            {
                $lookup: {
                    from: 'schools', // Tên collection của School model
                    localField: 'school',
                    foreignField: '_id',
                    as: 'schoolInfo'
                }
            },
            // Thêm bước lookup để populate teachingSchools cho giảng viên
            {
                $lookup: {
                    from: 'schools',
                    localField: 'teachingSchools',
                    foreignField: '_id',
                    as: 'teachingSchoolsInfo'
                }
            },
            {
                $addFields: {
                    assignedCourseCount: { $size: '$assignedCourses' },
                    school: { $arrayElemAt: ['$schoolInfo', 0] },
                    teachingSchools: '$teachingSchoolsInfo' // Ghi đè mảng ID bằng mảng object đã populate
                }
            },
            {
                $project: {
                    password: 0,
                    assignedCourses: 0,
                    schoolInfo: 0,
                    teachingSchoolsInfo: 0 // Xóa trường tạm
                }
            },
            { $sort: { isActive: 1, lastName: 1, firstName: 1 } }
        ];

        const users = await User.aggregate(aggregationPipeline);

        res.json({ users });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/users/me
// @desc    Lấy thông tin người dùng hiện tại
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        // req.user.id được thiết lập bởi middleware 'auth'
        const user = await User.findById(req.user.id).select('-password').populate('school', 'schoolName');
        if (!user) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng.' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   PUT api/users/me
// @desc    Người dùng tự cập nhật thông tin cá nhân
// @access  Private
router.put('/me', [
    auth,
    body('email', 'Vui lòng nhập email hợp lệ').optional().isEmail(),
    body('firstName', 'Họ là bắt buộc').optional().not().isEmpty(),
    body('lastName', 'Tên là bắt buộc').optional().not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
        }

        // Chỉ cập nhật các trường được phép
        const allowedUpdates = ['firstName', 'lastName', 'email', 'phone', 'address', 'dateOfBirth', 'gender', 'avatar', 'year', 'semester'];
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                user[key] = req.body[key];
            }
        });

        const updatedUser = await user.save();

        // Ghi log
        logActivity(req.user.id, 'UPDATE_PROFILE', {
            targetType: 'User',
            targetId: user._id,
            details: { message: 'User updated their own profile.' }
        });
        res.json(updatedUser.toJSON());
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/users/:id
// @desc    Lấy chi tiết người dùng theo ID
// @access  Private (Admin)
router.get('/:id', [auth, admin], async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('school', 'schoolName').select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   PUT api/users/:id
// @desc    Cập nhật thông tin người dùng (bao gồm cả việc kích hoạt/vô hiệu hóa)
// @access  Private (Admin)
router.put('/:id', [
    auth, 
    admin,
    // Thêm validation cho các trường có thể được cập nhật
    body('email', 'Vui lòng nhập email hợp lệ').optional().isEmail(),
    body('firstName', 'Họ là bắt buộc').optional().not().isEmpty(),
    body('lastName', 'Tên là bắt buộc').optional().not().isEmpty(),
], async (req, res) => {
    try {
        const userToUpdate = await User.findById(req.params.id);

        if (!userToUpdate) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
        }
        
        const { firstName, lastName, email, isActive, teachingSchools, year, semester } = req.body; // Thêm year, semester
        const changes = {}; // Để theo dõi các thay đổi

        // Validation cho year và semester nếu có
        // --- LOGIC MỚI: Xử lý khi vô hiệu hóa một giảng viên ---
        // Nếu người dùng bị vô hiệu hóa (isActive: false) và là một giảng viên
        if (isActive === false && userToUpdate.role === 'teacher') {
            const teacherId = userToUpdate._id;
            
            // Tìm TẤT CẢ các lớp học phần do giảng viên này phụ trách, bất kể trạng thái
            const coursesToUpdate = await Course.find({ teacher: teacherId });

            if (coursesToUpdate.length > 0) {
                const courseIds = coursesToUpdate.map(c => c._id);
                
                // Cập nhật hàng loạt các lớp học phần đó
                await Course.updateMany(
                    { _id: { $in: courseIds } },
                    { 
                        $set: { 
                            isActive: false, 
                            notes: "Lớp tạm khóa do giảng viên bị vô hiệu hóa." 
                        },
                        // Gỡ bỏ liên kết đến giảng viên đã bị vô hiệu hóa
                        $unset: { teacher: "" } 
                    }
                );

                console.log(`Đã tự động khóa ${courseIds.length} lớp học phần của giảng viên ${userToUpdate.firstName} ${userToUpdate.lastName}.`);
            }
        }
        // --- KẾT THÚC LOGIC MỚI ---

        // Cập nhật các trường thông tin khác nếu chúng được cung cấp
        if (firstName && userToUpdate.firstName !== firstName) {
            changes.firstName = { from: userToUpdate.firstName, to: firstName };
            userToUpdate.firstName = firstName;
        }
        if (lastName && userToUpdate.lastName !== lastName) {
            changes.lastName = { from: userToUpdate.lastName, to: lastName };
            userToUpdate.lastName = lastName;
        }
        if (email && userToUpdate.email !== email) {
            // Có thể thêm logic kiểm tra email trùng lặp ở đây nếu cần
            changes.email = { from: userToUpdate.email, to: email };
            userToUpdate.email = email;
        }
        if (typeof isActive !== 'undefined' && userToUpdate.isActive !== isActive) {
            changes.isActive = { from: userToUpdate.isActive, to: isActive };
            userToUpdate.isActive = isActive;
        }
        if (userToUpdate.role === 'teacher' && teachingSchools) userToUpdate.teachingSchools = teachingSchools; // NEW: Update teachingSchools
        
        // Cập nhật year và semester cho sinh viên
        if (userToUpdate.role === 'student') {
            if (year !== undefined && year !== null && !isNaN(parseInt(year))) userToUpdate.year = parseInt(year);
            if (semester !== undefined && semester !== null && !isNaN(parseInt(semester))) userToUpdate.semester = parseInt(semester);
        }



        await userToUpdate.save();

        // Ghi log
        if (Object.keys(changes).length > 0) {
            logActivity(req.user.id, 'UPDATE_USER_BY_ADMIN', {
                targetType: 'User',
                targetId: userToUpdate._id,
                details: { message: `Admin updated user ${userToUpdate.email}.`, changes }
            });
        }

        res.json({ msg: 'Cập nhật người dùng thành công', user: userToUpdate });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/users
// @desc    Xóa nhiều người dùng cùng lúc
// @access  Private (Admin)
router.delete('/', [auth, admin, verifyAdminPassword], async (req, res) => {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp danh sách ID người dùng cần xóa.' });
    }

    try {
        // Tìm các giảng viên trong danh sách cần xóa để xử lý các lớp học phần liên quan
        const teachersToDelete = await User.find({ _id: { $in: userIds }, role: 'teacher' });
        const teacherIdsToDelete = teachersToDelete.map(t => t._id);

        if (teacherIdsToDelete.length > 0) {
            await Course.updateMany(
                { teacher: { $in: teacherIdsToDelete } },
                {
                    $set: { isActive: false, notes: "Lớp tạm khóa do giảng viên đã bị xóa." },
                    $unset: { teacher: "" }
                }
            );
            console.log(`Đã cập nhật các lớp học phần của ${teacherIdsToDelete.length} giảng viên sắp bị xóa.`);
        }

        const result = await User.deleteMany({ _id: { $in: userIds } });

        // Ghi log
        logActivity(req.user.id, 'BULK_DELETE_USERS', {
            targetType: 'User',
            details: { message: `Admin deleted ${result.deletedCount} users.`, deletedIds: userIds }
        });

        res.json({ msg: `Đã xóa thành công ${result.deletedCount} người dùng.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/users/:id
// @desc    Xóa người dùng (hard delete - không khuyến khích)
// @access  Private (Admin)
router.delete('/:id', [auth, admin, verifyAdminPassword], async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
        }

        // --- LOGIC MỚI: Xử lý khi XÓA HẲN một giảng viên ---
        if (userToDelete.role === 'teacher') {
            const teacherId = userToDelete._id;
            
            // Tìm và cập nhật các lớp học phần liên quan
            await Course.updateMany(
                { teacher: teacherId },
                { 
                    $set: { 
                        isActive: false, 
                        notes: "Lớp tạm khóa do giảng viên đã bị xóa khỏi hệ thống." 
                    },
                    $unset: { teacher: "" } // Gỡ bỏ liên kết đến giảng viên đã xóa
                }
            );
            console.log(`Đã cập nhật các lớp học phần của giảng viên sắp bị xóa.`);
        }
        // --- KẾT THÚC LOGIC MỚI ---

        await User.findByIdAndDelete(req.params.id);

        // Ghi log
        logActivity(req.user.id, 'DELETE_USER', {
            targetType: 'User',
            targetId: req.params.id,
            details: { message: `Admin deleted user ${userToDelete.email}.` }
        });

        res.json({ msg: 'Người dùng đã được xóa vĩnh viễn' });

    } catch (err) {
        console.error(err.message);
        // Thêm kiểm tra lỗi khóa ngoại nếu có
        if (err.name === 'MongoError' && err.code === 11000) { // Ví dụ
             return res.status(400).json({ msg: 'Không thể xóa người dùng vì có dữ liệu liên quan.' });
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   POST /api/users/import-teachers
// @desc    Import teachers from a CSV file
// @access  Private (Admin)
router.post('/import-teachers', [auth, admin, upload.single('file')], async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'Vui lòng tải lên một tệp.' });
    }

    const errors = [];
    const importedTeachers = [];
    const usersToInsert = []; // Array to hold user objects for bulk insert
    const schoolMap = new Map();

    // Fetch all schools to create a mapping
    try {
        // Lấy tất cả các trường để tạo map
        const allSchools = await School.find().select('_id schoolCode');
        allSchools.forEach(s => schoolMap.set(s.schoolCode.toUpperCase(), s._id));

        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const rows = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

        // Bỏ qua dòng tiêu đề
        const dataRows = rows.slice(1);

        for (const row of dataRows) {
            const originalRow = row; // Keep original row for error reporting
            const parts = row.split(',');
            const emailForRow = parts.length > 1 ? parts[1].trim() : 'không xác định';

            if (parts.length < 3) {
                errors.push({ row: { email: emailForRow }, msg: 'Dòng không đủ 3 cột bắt buộc (Họ và tên, email, mật khẩu).' });
                continue;
            }

            const fullName = parts[0].trim();
            const email = parts[1].trim();
            const password = parts[2].trim();
            const teachingSchoolsStr = (parts[3] || '').trim(); // Cột thứ 4, tùy chọn

            if (!fullName || !email || !password) {
                errors.push({ row: { email: emailForRow }, msg: 'Thiếu thông tin bắt buộc (Họ và tên, email, mật khẩu).' });
                continue;
            }

            // Xử lý các trường giảng dạy
            const schoolCodes = teachingSchoolsStr.split(';').map(s => s.trim().toUpperCase()).filter(Boolean);
            const schoolIds = [];
            let allSchoolsFound = true;
            for (const code of schoolCodes) {
                if (schoolMap.has(code)) {
                    schoolIds.push(schoolMap.get(code));
                } else {
                    errors.push({ row: { email: emailForRow }, msg: `Mã trường '${code}' không tồn tại.` });
                    allSchoolsFound = false;
                    break;
                }
            }
            if (!allSchoolsFound) continue;

            // Kiểm tra email đã tồn tại chưa
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                errors.push({ row: { email: emailForRow }, msg: `Email '${email}' đã tồn tại.` });
                continue;
            }

            const nameParts = fullName.trim().split(' ');
            const lastName = nameParts.pop() || '';
            const firstName = nameParts.join(' ');
            
            // Manually hash password before bulk insert
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            usersToInsert.push({
                firstName,
                lastName,
                email,
                password: hashedPassword, // Use hashed password
                role: 'teacher',
                teachingSchools: schoolIds,
                isActive: true, // Default to active
            });
        }

        // Perform bulk insert
        if (usersToInsert.length > 0) {
            try {
                const result = await User.insertMany(usersToInsert, { ordered: false });
                importedTeachers.push(...result);
            } catch (bulkWriteError) {
                // Handle errors from bulk insert (e.g., duplicate key errors, validation errors)
                if (bulkWriteError.writeErrors) {
                    bulkWriteError.writeErrors.forEach(err => {
                        const emailFromError = usersToInsert[err.index].email;
                        errors.push({ row: { email: emailFromError }, msg: err.errmsg || err.message });
                    });
                } else {
                    // General error
                    errors.push({ row: { email: 'unknown' }, msg: bulkWriteError.message });
                }
            }
        }

        fs.unlinkSync(req.file.path); // Xóa tệp tạm

        res.json({ // Use dataRows.length for processedCount
            msg: `Đã xử lý ${dataRows.length} dòng. Thêm thành công ${importedTeachers.length} giảng viên.`, // Update message
            processedCount: dataRows.length,
            importedCount: importedTeachers.length,
            failedCount: errors.length,
            errors: errors
        });

    } catch (err) {
        // Ensure file is unlinked even if an error occurs before bulk insert
        console.error(err.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   POST /api/users/import-students
// @desc    Import students from a CSV file
// @access  Private (Admin)
router.post('/import-students', [auth, admin, upload.single('file')], async (req, res) => {
    const { semesterId } = req.body;

    if (!req.file) {
        return res.status(400).json({ msg: 'Vui lòng tải lên một tệp CSV.' });
    }

    if (!semesterId) {
        return res.status(400).json({ msg: 'Vui lòng chọn một học kỳ để áp dụng.' });
    }

    const errors = [];
    const importedStudents = [];
    const usersToInsert = [];
    const schoolMap = new Map();
    let rowCount = 0;

    try {
        // 1. Lấy và tạo map cho các trường học để tra cứu nhanh
        const allSchools = await School.find().select('_id schoolCode');
        allSchools.forEach(s => schoolMap.set(s.schoolCode.toUpperCase(), s._id));

        // Lấy thông tin học kỳ đã chọn
        const selectedSemester = await Semester.findOne({ _id: semesterId, isActive: true });
        if (!selectedSemester) {
            return res.status(404).json({ msg: 'Học kỳ được chọn không hợp lệ hoặc không hoạt động.' });
        }

        // 2. Đọc và xử lý file CSV
        const results = await new Promise((resolve, reject) => {
            const tempResults = [];
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => tempResults.push(data))
                .on('end', () => resolve(tempResults))
                .on('error', (error) => reject(error));
        });

        const emailsInFile = new Set();
        const studentIdsInFile = new Set();
        const potentialUsers = [];

        for (const row of results) {
            rowCount++;
            const { fullName, email, password, studentId, schoolCode, year } = row;

            // 3. Validate dữ liệu từng dòng
            if (!fullName || !email || !password || !studentId || !schoolCode || !year) {
                errors.push({ row: rowCount, msg: 'Thiếu thông tin bắt buộc (fullName, email, password, studentId, schoolCode, year).', data: row });
                continue;
            }

            const parsedYear = parseInt(year, 10);
            if (isNaN(parsedYear) || parsedYear < 1) {
                errors.push({ row: rowCount, msg: `Năm học '${year}' không hợp lệ.`, data: row });
                continue;
            }

            // Kiểm tra trùng lặp trong chính file CSV
            if (emailsInFile.has(email.toLowerCase())) {
                errors.push({ row: rowCount, msg: `Email '${email}' bị trùng lặp trong tệp.`, data: row });
                continue;
            }
            if (studentIdsInFile.has(studentId)) {
                errors.push({ row: rowCount, msg: `Mã sinh viên '${studentId}' bị trùng lặp trong tệp.`, data: row });
                continue;
            }
            emailsInFile.add(email.toLowerCase());
            studentIdsInFile.add(studentId);

            potentialUsers.push({ row, rowNum: rowCount });
        }

        // 4. Kiểm tra hàng loạt với DB
        if (potentialUsers.length > 0) {
            const existingUsers = await User.find({ $or: [{ email: { $in: Array.from(emailsInFile) } }, { studentId: { $in: Array.from(studentIdsInFile) } }] }).select('email studentId');
            const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
            const existingStudentIds = new Set(existingUsers.map(u => u.studentId));

            for (const { row, rowNum } of potentialUsers) {
                const { fullName, email, password, studentId, schoolCode, year } = row;

                if (existingEmails.has(email.toLowerCase()) || existingStudentIds.has(studentId)) {
                    errors.push({ row: rowNum, msg: `Email hoặc Mã sinh viên '${email}/${studentId}' đã tồn tại trong hệ thống.`, data: row });
                    continue;
                }

                // Tìm schoolId từ schoolCode
                const schoolId = schoolMap.get(schoolCode.toUpperCase());
                if (!schoolId) {
                    errors.push({ row: rowNum, msg: `Mã trường '${schoolCode}' không hợp lệ.`, data: row });
                    continue;
                }

                // Tách họ và tên
                const nameParts = fullName.trim().split(' ');
                const lastName = nameParts.pop() || '';
                const firstName = nameParts.join(' ');

                // Băm mật khẩu
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                usersToInsert.push({
                    firstName,
                    lastName,
                    email,
                    password: hashedPassword,
                    studentId,
                    school: schoolId,
                    year: parseInt(year, 10), // Sử dụng năm học từ file CSV
                    semester: selectedSemester.semesterNumber, // Use the semester number from the selected semester
                    maxCredits: selectedSemester.maxCreditsPerStudent, // Gán tín chỉ tối đa từ học kỳ đã chọn
                    role: 'student',
                    isActive: true,
                    // Thêm rowNum để truy vết lỗi
                    originalRowNum: rowNum
                });
            }
        }

        // 5. Thêm hàng loạt vào database
        if (usersToInsert.length > 0) {
            console.log(`[Import Students] Attempting to insert ${usersToInsert.length} users.`);
            try {
                const result = await User.insertMany(usersToInsert, { ordered: false });
                importedStudents.push(...result);
                console.log(`[Import Students] Successfully inserted ${result.length} users.`);
            } catch (bulkWriteError) {
                // Xử lý lỗi khi insert hàng loạt (ví dụ: lỗi trùng lặp)
                if (bulkWriteError.writeErrors) {
                    // Lấy danh sách các bản ghi đã insert thành công
                    importedStudents.push(...(bulkWriteError.insertedDocs || []));

                    // Ghi nhận các lỗi
                    bulkWriteError.writeErrors.forEach(err => {
                        const failedUser = usersToInsert[err.index];
                        errors.push({ 
                            row: failedUser.originalRowNum, 
                            msg: `Lỗi với email ${failedUser.email}: ${err.errmsg}`,
                            data: failedUser
                        });
                        console.error(`[Import Students] BulkWriteError for row ${failedUser.originalRowNum}: ${err.errmsg}`);
                    });
                } else {
                    // Lỗi chung khác không phải BulkWriteError
                    throw bulkWriteError;
                    console.error(`[Import Students] Unexpected BulkWriteError:`, bulkWriteError);
                }
            }
        }

        // 6. Ghi log và trả về kết quả
        if (importedStudents.length > 0) {
            logActivity(req.user.id, 'BULK_CREATE_STUDENTS', {
                targetType: 'User',
                details: { message: `Admin imported ${importedStudents.length} students from CSV.` }
            });
        }

        res.json({
            msg: `Đã xử lý ${rowCount} dòng. Thêm thành công ${importedStudents.length} sinh viên.`,
            processedCount: rowCount,
            importedCount: importedStudents.length,
            failedCount: errors.length,
            errors: errors
        });

    } catch (err) {
        console.error("Lỗi khi import sinh viên:", err.message);
        res.status(500).send('Lỗi Server');
    } finally {
        // Xóa file tạm sau khi xử lý xong
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
    }
});

module.exports = router;