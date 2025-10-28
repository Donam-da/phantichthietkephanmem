const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

const router = express.Router();
const periodTimes = { 1: "7:00-9:00", 2: "9:00-11:00", 3: "13:00-15:00", 4: "15:00-17:00" };

// @route   GET /api/courses
// @desc    Get all courses with filters
// @access  Public
router.get('/', async (req, res) => {
    try {
        const {
            semester,
            isActive,
            teacher,
            subject,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};

        if (semester) filter.semester = semester;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (teacher) filter.teacher = teacher;
        if (subject) filter.subject = subject;

        const skip = (page - 1) * limit;

        const courses = await Course.find(filter)
            .populate('subject', 'subjectCode subjectName credits schools')
            .populate('teacher', 'firstName lastName email')
            .populate('semester', 'name code academicYear startDate endDate')
            .populate('schedule.classroom', 'roomCode')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Course.countDocuments(filter); // Giữ lại dòng này

        res.json({
            courses,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total,
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('subject', 'subjectCode subjectName credits major yearLevel category') // Thêm major, yearLevel, category
            .populate('teacher', 'firstName lastName email')
            .populate('semester', 'name code academicYear semesterNumber'); // Thêm semesterNumber

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json(course);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/courses
// @desc    Create a new class section
// @access  Private (Admin)
router.post('/', [
    auth,
    admin,
    body('subject', 'Môn học là bắt buộc').isMongoId(),
    body('classCode', 'Mã lớp là bắt buộc').not().isEmpty(),
    body('maxStudents', 'Sĩ số tối đa là bắt buộc').isInt({ min: 1 }),
    body('semester', 'Học kỳ là bắt buộc').isMongoId(),
    body('teacher', 'Teacher is required').isMongoId(),
    body('schedule', 'Lịch học là bắt buộc').isArray({ min: 1 }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { subject, classCode, semester } = req.body;

        const existingCourse = await Course.findOne({ subject, classCode, semester });
        if (existingCourse) {
            return res.status(400).json({ msg: 'Mã lớp đã tồn tại cho môn học này trong học kỳ này.' });
        }

        const course = new Course(req.body);
        await course.save();

        await course.populate([
            { path: 'subject', select: 'subjectCode subjectName credits' },
            { path: 'teacher', select: 'firstName lastName email' },
            { path: 'semester', select: 'name code academicYear' },
            { path: 'schedule.classroom', select: 'roomCode' }
        ]);

        res.status(201).json(course);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Lỗi Server' });
    }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Admin)
router.put('/:id', [auth, admin], async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ msg: 'Không tìm thấy lớp học phần' });
        }

        const { maxStudents, teacher, schedule, isActive } = req.body;

        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            { maxStudents, teacher, schedule, isActive },
            { new: true, runValidators: true }
        )
            .populate('subject', 'subjectCode subjectName credits')
            .populate('teacher', 'firstName lastName email')
            .populate('semester', 'name code academicYear')
            .populate('schedule.classroom', 'roomCode');

        res.json(updatedCourse);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Không tìm thấy lớp học phần' });
        }
        res.status(500).json({ msg: 'Lỗi Server' });
    }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('subject', 'credits');
        if (!course) {
            return res.status(404).json({ msg: 'Không tìm thấy lớp học phần' });
        }

        // Find all registrations for this course
        const Registration = require('../models/Registration');
        const User = require('../models/User');
        const registrations = await Registration.find({ course: req.params.id });
        
        // --- FIX: Correctly handle student credits and delete registrations ---
        if (registrations.length > 0) {
            const creditsToDecrement = course.subject?.credits || 0;
            for (const reg of registrations) {
                // Only decrement credits if the registration was approved
                if (reg.status === 'approved' && creditsToDecrement > 0) {
                    await User.findByIdAndUpdate(reg.student, { $inc: { currentCredits: -creditsToDecrement } });
                }
            }
            // Delete all registrations associated with the course
            await Registration.deleteMany({ course: req.params.id });
        }

        // Now, delete the course itself
        await Course.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Lớp học phần và tất cả các đăng ký liên quan đã được xóa thành công.' });
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Không tìm thấy lớp học phần' });
        }
        res.status(500).json({ msg: 'Lỗi Server' });
    }
});

module.exports = router;
