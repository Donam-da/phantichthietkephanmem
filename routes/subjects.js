const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// @route   POST api/subjects
// @desc    Tạo môn học mới
// @access  Private (Admin)
router.post('/', [auth, admin], async (req, res) => {
    const { subjectCode, subjectName, credits, schools } = req.body;
    try {
        if (!schools || schools.length === 0) {
            return res.status(400).json({ msg: 'Vui lòng chọn ít nhất một trường' });
        }

        let subject = await Subject.findOne({ subjectCode });
        if (subject) {
            return res.status(400).json({ msg: 'Mã môn học đã tồn tại' });
        }

        subject = new Subject({ subjectCode, subjectName, credits, schools });
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
router.put('/:id', [auth, admin], async (req, res) => {
    const { subjectName, credits, schools } = req.body;
    try {
        if (!schools || schools.length === 0) {
            return res.status(400).json({ msg: 'Vui lòng chọn ít nhất một trường' });
        }

        let subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ msg: 'Không tìm thấy môn học' });

        subject.subjectName = subjectName;
        subject.credits = credits;
        subject.schools = schools;

        await subject.save();
        await subject.populate('schools', 'schoolCode schoolName');
        res.json(subject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/subjects/:id
// @desc    Xóa môn học
// @access  Private (Admin)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ msg: 'Không tìm thấy môn học' });

        // TODO: Kiểm tra xem môn học có đang được sử dụng trong khóa học không trước khi xóa

        await Subject.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Đã xóa môn học thành công' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;