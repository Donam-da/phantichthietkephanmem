const express = require('express');
const { body, validationResult } = require('express-validator');
const ChangeRequest = require('../models/ChangeRequest');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

const router = express.Router();

// @route   POST /api/change-requests
// @desc    Student creates a request to change school
// @access  Private (Student)
router.post('/', [
    auth,
    body('requestType', 'Loại yêu cầu là bắt buộc').equals('change_school'),
    body('requestedValue', 'Trường mới là bắt buộc').isMongoId(),
], async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Chỉ sinh viên mới có thể tạo yêu cầu.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { requestedValue } = req.body;

    try {
        const student = await User.findById(req.user.id);

        // Check for existing pending request
        const existingRequest = await ChangeRequest.findOne({
            user: req.user.id,
            requestType: 'change_school',
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Bạn đã có một yêu cầu thay đổi trường đang chờ xử lý.' });
        }

        if (student.school.toString() === requestedValue) {
            return res.status(400).json({ message: 'Bạn đã ở trường này rồi.' });
        }

        const newRequest = new ChangeRequest({
            user: req.user.id,
            requestType: 'change_school',
            currentValue: student.school,
            requestedValue: requestedValue,
        });

        await newRequest.save();
        res.status(201).json({ message: 'Yêu cầu thay đổi trường của bạn đã được gửi để xem xét.' });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

// @route   GET /api/change-requests
// @desc    Admin gets all change requests
// @access  Private (Admin)
router.get('/', [auth, admin], async (req, res) => {
    try {
        const requests = await ChangeRequest.find()
            .populate('user', 'fullName studentId email')
            .populate('currentValue', 'schoolName') // Assuming currentValue is an ID for a School
            .populate('requestedValue', 'schoolName') // Assuming requestedValue is an ID for a School
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

// @route   PUT /api/change-requests/:id/approve
// @desc    Admin approves a change request
// @access  Private (Admin)
router.put('/:id/approve', [auth, admin], async (req, res) => {
    try {
        const request = await ChangeRequest.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý.' });
        }

        // Update user's school
        await User.findByIdAndUpdate(request.user, { school: request.requestedValue });

        // Update request status
        request.status = 'approved';
        request.resolvedBy = req.user.id;
        request.resolvedAt = new Date();
        await request.save();

        res.json({ message: 'Yêu cầu đã được phê duyệt và thông tin người dùng đã được cập nhật.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

// @route   PUT /api/change-requests/:id/reject
// @desc    Admin rejects a change request
// @access  Private (Admin)
router.put('/:id/reject', [auth, admin], async (req, res) => {
    try {
        const request = await ChangeRequest.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý.' });
        }

        request.status = 'rejected';
        request.adminNotes = req.body.reason || 'Không có lý do cụ thể.';
        request.resolvedBy = req.user.id;
        request.resolvedAt = new Date();
        await request.save();

        res.json({ message: 'Yêu cầu đã bị từ chối.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

module.exports = router;