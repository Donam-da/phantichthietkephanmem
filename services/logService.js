const ActivityLog = require('../models/ActivityLog');

/**
 * Ghi lại một hoạt động của người dùng vào cơ sở dữ liệu.
 * @param {string} userId - ID của người dùng thực hiện hành động.
 * @param {string} action - Tên hành động (ví dụ: 'LOGIN', 'CREATE_USER').
 * @param {object} options - Các thông tin bổ sung.
 * @param {string} [options.targetType] - Loại đối tượng bị tác động (ví dụ: 'User', 'Course').
 * @param {string} [options.targetId] - ID của đối tượng bị tác động.
 * @param {object} [options.details] - Chi tiết về hành động.
 * @param {string} [options.ipAddress] - Địa chỉ IP của người dùng.
 */
const logActivity = async (userId, action, options = {}) => {
    try {
        const log = new ActivityLog({
            user: userId,
            action,
            ...options,
        });
        await log.save();
    } catch (error) {
        console.error(`Failed to log activity: ${action} for user ${userId}`, error);
    }
};

module.exports = { logActivity };