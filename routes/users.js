const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course'); // Import Course model
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

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
        const users = await User.find(query).select('-password').populate('school', 'schoolName');
        res.json({ users });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/users/students/:id
// @desc    Lấy chi tiết sinh viên
// @access  Private (Admin)
router.get('/students/:id', [auth, admin], async (req, res) => {
    try {
        const student = await User.findById(req.params.id).populate('school', 'schoolName').select('-password');
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
        }
        res.json(student);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});


// @route   PUT api/users/:id
// @desc    Cập nhật thông tin người dùng (bao gồm cả việc kích hoạt/vô hiệu hóa)
// @access  Private (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
    const { isActive } = req.body;

    try {
        const userToUpdate = await User.findById(req.params.id);

        if (!userToUpdate) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
        }

        // Chỉ cập nhật các trường được gửi lên
        if (typeof isActive !== 'undefined') {
            userToUpdate.isActive = isActive;
        }

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

        await userToUpdate.save();

        res.json({ msg: 'Cập nhật người dùng thành công', user: userToUpdate });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/users/:id
// @desc    Xóa người dùng (hard delete - không khuyến khích)
// @access  Private (Admin)
router.delete('/:id', [auth, admin], async (req, res) => {
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


module.exports = router;