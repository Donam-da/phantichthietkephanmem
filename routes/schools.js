// routes/schools.js
const express = require('express');
const router = express.Router();
const School = require('../models/School');
const Subject = require('../models/Subject'); // Import Subject model
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// @route   POST api/schools
// @desc    Tạo trường mới
// @access  Private (Admin)
router.post('/', [auth, admin], async (req, res) => {
    const { schoolCode, schoolName } = req.body;
    try {
        let school = await School.findOne({ schoolCode });
        if (school) {
            return res.status(400).json({ msg: 'Mã trường đã tồn tại' });
        }
        school = new School({ schoolCode, schoolName });
        await school.save();
        res.json(school);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/schools
// @desc    Lấy tất cả các trường
// @access  Private
router.get('/', async (req, res) => {
    try {
        const schools = await School.find().sort({ createdAt: -1 });
        res.json(schools);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   PUT api/schools/:id
// @desc    Cập nhật thông tin trường
// @access  Private (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
    const { schoolCode, schoolName } = req.body;
    try {
        let school = await School.findById(req.params.id);
        if (!school) return res.status(404).json({ msg: 'Không tìm thấy trường' });

        // Kiểm tra xem mã trường mới có bị trùng với trường khác không
        if (schoolCode && school.schoolCode !== schoolCode) {
            const existingSchool = await School.findOne({ schoolCode });
            // Nếu mã mới đã tồn tại và không phải là của trường đang sửa
            if (existingSchool && existingSchool._id.toString() !== req.params.id) {
                return res.status(400).json({ msg: 'Mã trường đã tồn tại' });
            }
            school.schoolCode = schoolCode;
        }

        // Cập nhật tên trường nếu có
        if (schoolName) {
            school.schoolName = schoolName;
        }

        await school.save();
        res.json(school);
    } catch (err) {
        // Bắt lỗi trùng lặp mã trường từ MongoDB (phòng trường hợp race condition)
        if (err.code === 11000) return res.status(400).json({ msg: 'Mã trường đã tồn tại' });
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/schools/:id
// @desc    Xóa trường
// @access  Private (Admin)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        let school = await School.findById(req.params.id);
        if (!school) return res.status(404).json({ msg: 'Không tìm thấy trường' });

        // Kiểm tra xem trường có đang được sử dụng bởi môn học nào không
        const subjectCount = await Subject.countDocuments({ schools: req.params.id });
        if (subjectCount > 0) {
            return res.status(400).json({ msg: `Không thể xóa. Có ${subjectCount} môn học đang thuộc trường này.` });
        }

        await School.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Đã xóa trường thành công' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;
