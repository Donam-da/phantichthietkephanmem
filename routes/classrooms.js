const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// @route   POST api/classrooms
// @desc    Tạo phòng học mới
// @access  Private (Admin)
router.post('/', [auth, admin], async (req, res) => {
    const { building, floor, roomNumber, roomType, capacity } = req.body;
    try {
        const roomCode = `A${building}-${floor}0${roomNumber}`;
        let classroom = await Classroom.findOne({ roomCode });
        if (classroom) {
            return res.status(400).json({ msg: 'Phòng học đã tồn tại' });
        }

        classroom = new Classroom({ building, floor, roomNumber, roomType, capacity });
        await classroom.save();
        res.status(201).json(classroom);
    } catch (err) {
        console.error(err.message);
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Phòng học đã tồn tại.' });
        }
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/classrooms
// @desc    Lấy tất cả phòng học
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const classrooms = await Classroom.find().sort({ roomCode: 1 });
        res.json(classrooms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   PUT api/classrooms/:id
// @desc    Cập nhật thông tin phòng học
// @access  Private (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
    const { roomType, capacity, isActive } = req.body;
    const fieldsToUpdate = {};
    if (roomType) fieldsToUpdate.roomType = roomType;
    if (capacity) fieldsToUpdate.capacity = capacity;
    if (isActive !== undefined) fieldsToUpdate.isActive = isActive;

    try {
        let classroom = await Classroom.findById(req.params.id);
        if (!classroom) return res.status(404).json({ msg: 'Không tìm thấy phòng học' });

        classroom = await Classroom.findByIdAndUpdate(
            req.params.id,
            { $set: fieldsToUpdate },
            { new: true }
        );
        res.json(classroom);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/classrooms/:id
// @desc    Xóa phòng học
// @access  Private (Admin)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) return res.status(404).json({ msg: 'Không tìm thấy phòng học' });

        // TODO: Kiểm tra xem phòng học có đang được sử dụng trong lịch học không trước khi xóa

        await Classroom.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Đã xóa phòng học thành công' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;