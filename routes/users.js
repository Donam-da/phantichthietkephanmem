const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth'); // Import adminAuth
const { admin } = require('../middleware/admin');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filters
// @access  Private (Admin only)
router.get('/', [auth, admin], async (req, res) => {
  try {

    const {
      role,
      page = 1,
      limit = 10,
      search
    } = req.query;

    const filter = {};

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password')
      .populate('school', 'schoolName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create a new user by admin
// @access  Private (Admin only)
router.post('/', [
  auth,
  admin,
  body('fullName', 'Họ và tên là bắt buộc').not().isEmpty(),
  body('email', 'Vui lòng nhập email hợp lệ').isEmail(),
  body('password', 'Mật khẩu phải có ít nhất 6 ký tự').isLength({ min: 6 }),
  body('role', 'Vai trò là bắt buộc').isIn(['student', 'teacher', 'admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.array()[0].msg });
  }

  const { fullName, email, password, role } = req.body;

  try {
    // Tách fullName thành firstName và lastName
    const nameParts = fullName.trim().split(' ');
    const lastName = nameParts.pop();
    const firstName = nameParts.join(' ');

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'Email đã tồn tại' });
    }

    user = new User({
      firstName,
      lastName,
      email,
      password, // Password will be hashed by the pre-save hook in the User model
      role,
      // For student, other fields like major, year, semester would be needed
      // For this admin-creation, we assume creating non-student roles is simpler
    });

    await user.save();

    res.status(201).json({ msg: 'Tạo người dùng thành công', user });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Lỗi Server');
  }
});

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', [
  auth,
  body('firstName', 'First name is required').not().isEmpty(),
  body('lastName', 'Last name is required').not().isEmpty(),
  body('email', 'Please include a valid email').isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, phone, address, dateOfBirth, gender, avatar } = req.body;

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const updateData = {
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
    };
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user by admin
// @access  Private (Admin only)
router.put('/:id', [
  auth,
  body('firstName').optional().not().isEmpty().withMessage('First name is required'),
  body('lastName').optional().not().isEmpty().withMessage('Last name is required'),
  body('email').optional().isEmail().withMessage('Please include a valid email')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, role, major, year, semester, isActive } = req.body;

    // Check if email is already taken by another user (only if provided)
    if (email !== undefined) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Build update payload only with provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (major !== undefined) updateData.major = major;
    if (year !== undefined) updateData.year = year;
    if (semester !== undefined) updateData.semester = semester;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/students/:id
// @desc    Get a specific student's details
// @access  Private (Admin only)
router.get('/students/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const student = await User.findOne({ _id: req.params.id, role: 'student' })
      .select('-password')
      .populate('school', 'schoolName');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/students
// @desc    Get all students
// @access  Private
router.get('/students', auth, async (req, res) => {
  try {
    const { major, year, semester } = req.query;

    const filter = { role: 'student' };
    if (major) filter.major = major;
    if (year) filter.year = parseInt(year);
    if (semester) filter.semester = parseInt(semester);

    const students = await User.find(filter)
      .select('firstName lastName studentId email major year semester gpa currentCredits maxCredits')
      .sort({ lastName: 1, firstName: 1 });

    res.json(students);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/teachers
// @desc    Get all teachers
// @access  Public
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', isActive: true })
      .select('firstName lastName email')
      .sort({ lastName: 1, firstName: 1 });

    res.json(teachers);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 