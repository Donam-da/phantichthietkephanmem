const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true,
        // Ví dụ: 'LOGIN', 'CREATE_USER', 'UPDATE_COURSE', 'REGISTER_COURSE'
    },
    targetType: {
        type: String, // Ví dụ: 'User', 'Course', 'Semester'
    },
    targetId: {
        type: String,
    },
    details: {
        type: mongoose.Schema.Types.Mixed, // Để lưu các chi tiết bổ sung
    },
    ipAddress: {
        type: String,
    },
}, { timestamps: true }); // Tự động thêm createdAt

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);