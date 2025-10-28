const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const Course = require('../models/Course'); // Import Course model
const verifyAdminPassword = require('../middleware/verifyAdminPassword'); // Import middleware
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });

// @route   POST api/classrooms
// @desc    Tạo phòng học mới
// @access  Private (Admin)
router.post('/', [auth, admin], async (req, res) => { // Giữ lại dòng này
    const { roomCode, roomType, capacity } = req.body;
    try {
        let classroom = await Classroom.findOne({ roomCode });
        if (classroom) {
            return res.status(400).json({ msg: 'Phòng học đã tồn tại' });
        }

        classroom = new Classroom({ roomCode, roomType, capacity });
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
router.put('/:id', [auth, admin], async (req, res) => { // Giữ lại dòng này
    const { roomType, capacity, isActive, notes } = req.body;
    const { scheduledEvents } = req.body; // Lấy mảng sự kiện từ request body
    const fieldsToUpdate = {};
    if (roomType) fieldsToUpdate.roomType = roomType;
    if (capacity) fieldsToUpdate.capacity = capacity;
    if (isActive !== undefined) fieldsToUpdate.isActive = isActive;
    if (notes !== undefined) fieldsToUpdate.notes = notes;
    if (scheduledEvents !== undefined) fieldsToUpdate.scheduledEvents = scheduledEvents; // Cập nhật mảng sự kiện
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

        // Kiểm tra xem phòng học có đang được sử dụng trong lịch học không trước khi xóa
        const courseCount = await Course.countDocuments({ 'schedule.classroom': req.params.id });
        if (courseCount > 0) {
            return res.status(400).json({ msg: `Không thể xóa. Có ${courseCount} lớp học phần đang sử dụng phòng này.` });
        }

        await Classroom.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Đã xóa phòng học thành công' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/classrooms
// @desc    Xóa nhiều phòng học cùng lúc
// @access  Private (Admin)
router.delete('/', [auth, admin, verifyAdminPassword], async (req, res) => {
    const { classroomIds } = req.body;
    if (!classroomIds || !Array.isArray(classroomIds) || classroomIds.length === 0) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp danh sách ID phòng học cần xóa.' });
    }
    try {
        // Kiểm tra xem có phòng học nào trong danh sách đang được sử dụng không
        const courseCount = await Course.countDocuments({ 'schedule.classroom': { $in: classroomIds } });
        if (courseCount > 0) {
            return res.status(400).json({ msg: 'Không thể xóa. Tồn tại phòng học đang được sử dụng trong các lớp học phần.' });
        }
        const result = await Classroom.deleteMany({ _id: { $in: classroomIds } });
        res.json({ msg: `Đã xóa thành công ${result.deletedCount} phòng học.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   POST /api/classrooms/import
// @desc    Import classrooms from a CSV file
// @access  Private (Admin)
router.post('/import', [auth, admin, upload.single('file')], async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'Vui lòng tải lên một tệp.' });
    }

    const errors = [];
    const importedClassrooms = [];

    try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const rows = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

        // Bỏ qua dòng tiêu đề
        const dataRows = rows.slice(1);

        for (const row of dataRows) {
            const parts = row.split(',');
            const roomCodeForRow = parts.length > 2 ? `A${parts[0].trim()}-${parts[2].trim()}0${parts[1].trim()}` : 'không xác định';

            if (parts.length < 5) {
                errors.push({ row: { roomCode: roomCodeForRow }, msg: 'Dòng không đủ 5 cột (Tòa, Tầng, Phòng, Loại phòng, Sức chứa).' });
                continue;
            }

            const [building, floor, roomNumber, roomType, capacity] = parts.map(p => p.trim());

            if (!building || !floor || !roomNumber || !roomType || !capacity) {
                errors.push({ row: { roomCode: roomCodeForRow }, msg: 'Thiếu thông tin bắt buộc.' });
                continue;
            }

            // Ghép thành mã phòng
            const roomCode = `A${building}-${roomNumber}0${floor}`;

            // Kiểm tra loại phòng hợp lệ
            const validRoomTypes = ['theory', 'lab', 'computer_lab', 'lecture_hall'];
            const lowerRoomType = roomType.toLowerCase();
            if (!validRoomTypes.includes(lowerRoomType)) {
                errors.push({ row: { roomCode }, msg: `Loại phòng '${roomType}' không hợp lệ.` });
                continue;
            }

            // Kiểm tra sức chứa
            const parsedCapacity = parseInt(capacity, 10);
            if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
                errors.push({ row: { roomCode }, msg: `Sức chứa '${capacity}' không hợp lệ.` });
                continue;
            }

            // Kiểm tra mã phòng đã tồn tại chưa
            const existingClassroom = await Classroom.findOne({ roomCode });
            if (existingClassroom) {
                errors.push({ row: { roomCode }, msg: `Mã phòng '${roomCode}' đã tồn tại.` });
                continue;
            }

            const newClassroom = new Classroom({ roomCode, roomType: lowerRoomType, capacity: parsedCapacity });
            await newClassroom.save();
            importedClassrooms.push(newClassroom);
        }

        fs.unlinkSync(req.file.path); // Xóa tệp tạm

        res.json({
            msg: `Đã xử lý ${dataRows.length} dòng. Thêm thành công ${importedClassrooms.length} phòng học.`,
            processedCount: dataRows.length,
            importedCount: importedClassrooms.length,
            failedCount: errors.length,
            errors: errors
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;