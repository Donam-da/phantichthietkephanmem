const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Registration = require('../models/Registration'); // Import Registration model
const { logActivity } = require('../services/logService'); // Import logService
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Private (Admin Only) - Changed from Public to prevent self-registration
router.post('/register', [
    auth,
    admin,
    body('fullName', 'Họ và tên là bắt buộc').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    body('role', 'Role is required').isIn(['student', 'teacher']) // Admin should be created via a separate, more secure process
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            fullName,
            email,
            password,
            role,
            school,
            phone,
            address,
            dateOfBirth,
            gender
        } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Validate student-specific fields
        if (role === 'student') {
            if (!school) {
                return res.status(400).json({ message: 'Vui lòng chọn trường' });
            }
        }

        // Tách fullName thành firstName và lastName
        const nameParts = fullName.trim().split(' ');
        const lastName = nameParts.pop();
        const firstName = nameParts.join(' ');

        // Create new user
        user = new User({
            firstName,
            lastName,
            email,
            password,
            role,
            school: role === 'student' ? school : undefined,
            phone,
            address,
            dateOfBirth,
            gender
        });

        await user.save();

        // Create JWT payload
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        // Sign JWT token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;

                // Remove password from user object
                const userResponse = user.toJSON();
                delete userResponse.password;

                res.json({
                    token,
                    user: userResponse,
                    message: 'User registered successfully'
                });
            }
        );
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email }).populate('school');
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(400).json({ message: 'Account is deactivated' });
        }

        // Validate password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // --- GHI LẠI HOẠT ĐỘNG ĐĂNG NHẬP ---
        logActivity(user._id, 'LOGIN_SUCCESS', {
            ipAddress: req.ip || req.connection.remoteAddress,
            details: { message: `User ${user.email} logged in successfully.` }
        });


        // --- NEW: Recalculate and sync currentCredits on login ---
        if (user.role === 'student') {
            const approvedRegistrations = await Registration.find({
                student: user._id,
                status: { $in: ['approved', 'pending'] } // Bao gồm cả 'pending'
            }).populate({
                path: 'course',
                select: 'subject',
                populate: { path: 'subject', select: 'credits' }
            });

            const recalculatedCredits = approvedRegistrations.reduce((total, reg) => {
                return total + (reg.course?.subject?.credits || 0);
            }, 0);
            user.currentCredits = recalculatedCredits;
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Create JWT payload
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        // Sign JWT token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;

                // Remove password from user object
                const userResponse = user.toJSON();
                delete userResponse.password;

                res.json({
                    token,
                    user: userResponse,
                    message: 'Login successful'
                });
            }
        );
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').populate('school');
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
    auth,
    body('currentPassword', 'Current password is required').not().isEmpty(),
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Ghi log
        logActivity(req.user.id, 'CHANGE_PASSWORD', {
            ipAddress: req.ip || req.connection.remoteAddress,
            details: { message: 'User changed their password successfully.' }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
    body('email', 'Please include a valid email').isEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // TODO: Implement email sending logic here
        // For now, just return success message
        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh-token', auth, async (req, res) => {
    try {
        // Create new JWT payload
        const payload = {
            user: {
                id: req.user.id,
                role: req.user.role
            }
        };

        // Sign new JWT token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (error) {
        console.error('Refresh token error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/logout
// @desc    Log user out
// @access  Private
router.post('/logout', auth, async (req, res) => {
    try {
        logActivity(req.user.id, 'LOGOUT', { ipAddress: req.ip || req.connection.remoteAddress });
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during logout.' });
    }
});

module.exports = router;
