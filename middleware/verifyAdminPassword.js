const User = require('../models/User');

const verifyAdminPassword = async (req, res, next) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp mật khẩu để xác nhận.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Không tìm thấy người dùng.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Mật khẩu không chính xác.' });
        }

        next();
    } catch (error) {
        res.status(500).send('Lỗi Server');
    }
};

module.exports = verifyAdminPassword;