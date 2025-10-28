const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course'); // Import Course model
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const multer = require('multer');
const fs = require('fs');

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
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, studentId, school } = req.body;

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

        user = new User({
            email,
            password,
            firstName,
            lastName,
            role,
            studentId: role === 'student' ? studentId : undefined,
            school: role === 'student' ? school : undefined,
        });

        await user.save();

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
        const { role } = req.query;
        const query = {};
        if (role) {
            query.role = role;
        }
        const users = await User.find(query)
            .select('-password')
            .populate('school', 'schoolName')
            // Sắp xếp: tài khoản vô hiệu hóa (isActive: false) lên đầu, sau đó sắp xếp theo tên
            .sort({ isActive: 1, lastName: 1, firstName: 1 });
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
        
        const { firstName, lastName, email, isActive } = req.body;
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
        if (firstName) userToUpdate.firstName = firstName;
        if (lastName) userToUpdate.lastName = lastName;
        if (email && userToUpdate.email !== email) {
            // Có thể thêm logic kiểm tra email trùng lặp ở đây nếu cần
            userToUpdate.email = email;
        }
        if (typeof isActive !== 'undefined') userToUpdate.isActive = isActive;

        await userToUpdate.save();

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

    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const rows = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

        // Bỏ qua dòng tiêu đề
        const dataRows = rows.slice(1);

        for (const row of dataRows) {
            const parts = row.split(',');
            const emailForRow = parts.length > 1 ? parts[1].trim() : 'không xác định';

            if (parts.length < 3) {
                errors.push({ row: { email: emailForRow }, msg: 'Dòng không đủ 3 cột (Họ và tên, email, mật khẩu).' });
                continue;
            }

            const fullName = parts[0].trim();
            const email = parts[1].trim();
            const password = parts[2].trim();

            if (!fullName || !email || !password) {
                errors.push({ row: { email }, msg: 'Thiếu thông tin bắt buộc.' });
                continue;
            }

            // Kiểm tra email đã tồn tại chưa
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                errors.push({ row: { email }, msg: `Email '${email}' đã tồn tại.` });
                continue;
            }

            const nameParts = fullName.trim().split(' ');
            const lastName = nameParts.pop() || '';
            const firstName = nameParts.join(' ');

            const newTeacher = new User({
                firstName,
                lastName,
                email,
                password,
                role: 'teacher'
            });

            await newTeacher.save();
            importedTeachers.push(newTeacher);
        }

        fs.unlinkSync(req.file.path); // Xóa tệp tạm

        res.json({
            msg: `Đã xử lý ${dataRows.length} dòng. Thêm thành công ${importedTeachers.length} giảng viên.`,
            processedCount: dataRows.length,
            importedCount: importedTeachers.length,
            failedCount: errors.length,
            errors: errors
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;