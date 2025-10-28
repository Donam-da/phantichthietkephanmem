const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator'); // Thêm dòng này
const Subject = require('../models/Subject');
const { auth } = require('../middleware/auth');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const { admin } = require('../middleware/admin');

// @route   POST api/subjects
// @desc    Tạo môn học mới
// @access  Private (Admin)
router.post('/', [
    auth,
    admin,
    body('subjectCode', 'Mã môn học là bắt buộc').not().isEmpty(),
    body('subjectName', 'Tên môn học là bắt buộc').not().isEmpty(),
    body('credits', 'Số tín chỉ là bắt buộc và phải là số').isInt({ min: 0 }),
    body('schools', 'Vui lòng chọn ít nhất một trường').isArray({ min: 1 }),
    body('major', 'Ngành là bắt buộc').not().isEmpty(),
    body('yearLevel', 'Năm học là bắt buộc và phải là số').isInt({ min: 1, max: 5 }),
    body('category', 'Loại môn học là bắt buộc').isIn(['required', 'elective', 'general'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { subjectCode, subjectName, credits, schools, major, yearLevel, category } = req.body;
    try {
        if (!schools || schools.length === 0) {
            return res.status(400).json({ msg: 'Vui lòng chọn ít nhất một trường' });
        }

        let subject = await Subject.findOne({ subjectCode });
        if (subject) {
            return res.status(400).json({ msg: 'Mã môn học đã tồn tại' });
        }

        subject = new Subject({ subjectCode, subjectName, credits, schools, major, yearLevel, category });
        await subject.save();
        await subject.populate('schools', 'schoolCode schoolName');
        res.status(201).json(subject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/subjects
// @desc    Lấy tất cả môn học
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const subjects = await Subject.find().populate('schools', 'schoolCode schoolName').sort({ subjectCode: 1 });
        res.json(subjects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   PUT api/subjects/:id
// @desc    Cập nhật thông tin môn học
// @access  Private (Admin)
router.put('/:id', [
    auth,
    admin,
    body('subjectName', 'Tên môn học là bắt buộc').not().isEmpty(),
    body('credits', 'Số tín chỉ là bắt buộc và phải là số').isInt({ min: 0 }),
    body('schools', 'Vui lòng chọn ít nhất một trường').isArray({ min: 1 }),
    body('major', 'Ngành là bắt buộc').not().isEmpty(),
    body('yearLevel', 'Năm học là bắt buộc và phải là số').isInt({ min: 1, max: 5 }),
    body('category', 'Loại môn học là bắt buộc').isIn(['required', 'elective', 'general'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { subjectName, credits, schools, major, yearLevel, category } = req.body;
    try {
        if (!schools || schools.length === 0) {
            return res.status(400).json({ msg: 'Vui lòng chọn ít nhất một trường' });
        }

        let subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ msg: 'Không tìm thấy môn học' });

        subject.subjectName = subjectName;
        subject.credits = credits;
        subject.schools = schools;
        subject.major = major;
        subject.yearLevel = yearLevel;
        subject.category = category;

        await subject.save();
        await subject.populate('schools', 'schoolCode schoolName');
        res.json(subject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/subjects/:id
// @desc    Xóa một môn học
// @access  Private (Admin)
// Thêm middleware verifyAdminPassword
router.delete('/:id', [auth, admin, verifyAdminPassword], async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ msg: 'Không tìm thấy môn học' });

        // TODO: Kiểm tra xem môn học có đang được sử dụng trong khóa học không trước khi xóa
        // Hiện tại, chúng ta sẽ cho phép xóa. Nếu có khóa học liên quan, cần xử lý logic đó.

        await Subject.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Đã xóa môn học thành công' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/subjects
// @desc    Xóa nhiều môn học cùng lúc
// @access  Private (Admin)
// Thêm middleware verifyAdminPassword
router.delete('/', [auth, admin, verifyAdminPassword], async (req, res) => {
    const { subjectIds } = req.body;

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp danh sách ID môn học cần xóa.' });
    }

    try {
        const result = await Subject.deleteMany({ _id: { $in: subjectIds } });
        res.json({ msg: `Đã xóa thành công ${result.deletedCount} môn học.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;