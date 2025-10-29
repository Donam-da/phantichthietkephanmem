const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

// @route   GET /api/health/status
// @desc    Kiểm tra "sức khỏe" của hệ thống (kết nối DB)
// @access  Private (Admin)
router.get('/status', [auth, admin], async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const dbStatusMap = {
            0: { status: 'disconnected', ok: false, message: 'Mất kết nối' },
            1: { status: 'connected', ok: true, message: 'Kết nối tốt' },
            2: { status: 'connecting', ok: false, message: 'Đang kết nối' },
            3: { status: 'disconnecting', ok: false, message: 'Đang ngắt kết nối' },
        };

        const dbHealth = dbStatusMap[dbState] || { status: 'unknown', ok: false, message: 'Không xác định' };

        res.json({
            database: dbHealth,
            api: {
                status: 'operational',
                ok: true,
                message: 'Hoạt động'
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi Server khi kiểm tra trạng thái.' });
    }
});

module.exports = router;