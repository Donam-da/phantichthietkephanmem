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
    body('teacher', 'Teacher ID must be a valid Mongo ID if provided').optional({ checkFalsy: true }).isMongoId(),
    body('schedule', 'Lịch học là bắt buộc').isArray({ min: 1 }),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { subject, classCode, semester, teacher } = req.body;

        const existingCourse = await Course.findOne({ subject, classCode, semester });
        if (existingCourse) {
            return res.status(400).json({ msg: 'Mã lớp đã tồn tại cho môn học này trong học kỳ này.' });
        }

        const newCourseData = { ...req.body };
        // Automatically set isActive to false if no teacher is assigned
        // If a teacher is assigned, it can be active (true by default). If not, it must be inactive.
        // This allows an admin to create an active course with a teacher, or an inactive one without.
        // The `!!teacher` converts the teacher ID (or lack thereof) to a boolean.

        // Explicitly set to false if no teacher, overriding any potential `isActive: true` in the request body.
        if (!teacher) {
            newCourseData.isActive = false;
            newCourseData.notes = "Lớp tạm khóa do chưa có giảng viên.";
            // Instead of setting to null, remove the key if it's falsy (empty string)
            delete newCourseData.teacher;
        } else {
            newCourseData.isActive = true; // Default to active if a teacher is assigned
        }

        const course = new Course(newCourseData);
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

        const { maxStudents, teacher, schedule, notes } = req.body;
        let { isActive } = req.body; // Giữ lại dòng này

        // If a teacher is removed, the course must be deactivated.
        // If a teacher is present, isActive can be what the user sent.
        const finalIsActive = !!teacher && isActive; // Course is active ONLY IF a teacher is present AND isActive is true.
        const finalNotes = !teacher ? "Lớp tạm khóa do thiếu giảng viên." : notes;

        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            { maxStudents, teacher, schedule, isActive: finalIsActive, notes: finalNotes },
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

// @route   POST /api/courses/sync-teacher-status
// @desc    Deactivate active courses that have no teacher
// @access  Private (Admin only)
router.post('/sync-teacher-status', [auth, admin], async (req, res) => {
    try {
        const result = await Course.updateMany(
            { 
                teacher: null,      // Find courses where teacher is not set
                isActive: true      // and the course is currently active
            },
            { 
                $set: { 
                    isActive: false, 
                    notes: "Lớp tạm khóa do thiếu giảng viên." 
                } 
            }
        );

        res.json({ message: `Đồng bộ hóa thành công. Đã cập nhật ${result.modifiedCount} lớp học phần.`, count: result.modifiedCount });
    } catch (error) {
        console.error('Error syncing course status:', error.message);
        res.status(500).json({ msg: 'Lỗi Server khi đồng bộ hóa trạng thái lớp học phần.' });
    }
});

module.exports = router;
