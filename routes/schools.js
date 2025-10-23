// routes/schools.js
const express = require('express');
const router = express.Router();
const School = require('../models/School');
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
router.get('/', auth, async (req, res) => {
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
    const { schoolName } = req.body;
    const schoolFields = {};
    if (schoolName) schoolFields.schoolName = schoolName;

    try {
        let school = await School.findById(req.params.id);
        if (!school) return res.status(404).json({ msg: 'Không tìm thấy trường' });

        school = await School.findByIdAndUpdate(
            req.params.id,
            { $set: schoolFields },
            { new: true }
        );
        res.json(school);
    } catch (err) {
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

        await School.findByIdAndRemove(req.params.id);
        res.json({ msg: 'Đã xóa trường thành công' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;
