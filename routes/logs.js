const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { auth } = require('../middleware/auth');
const User = require('../models/User'); // Thêm User model
const { admin } = require('../middleware/admin');

// @route   GET /api/logs
// @desc    Lấy danh sách hoạt động của người dùng
// @access  Private (Admin)
router.get('/', [auth, admin], async (req, res) => {
    try {
        const { page = 1, limit = 20, userId, role } = req.query;

        const filter = {};
        if (userId) {
            filter.user = userId;
        } else if (role) {
            // Nếu có vai trò được chọn, tìm tất cả user ID thuộc vai trò đó
            const usersInRole = await User.find({ role: role }).select('_id');
            const userIdsInRole = usersInRole.map(u => u._id);
            filter.user = { $in: userIdsInRole };
        }

        const logs = await ActivityLog.find(filter)
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await ActivityLog.countDocuments(filter); // Đếm dựa trên bộ lọc

        res.json({
            logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi Server khi lấy nhật ký hoạt động.' });
    }
});

module.exports = router;