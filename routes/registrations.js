const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Course = require('../models/Course');
const User = require('../models/User');
const Semester = require('../models/Semester');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/registrations
// @desc    Get all registrations with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      student,
      course,
      semester,
      status,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    // Students can only see their own registrations
    if (req.user.role === 'student') {
      filter.student = req.user.id;
    } else if (student) {
      filter.student = student;
    }

    if (course) filter.course = course;
    if (semester) filter.semester = semester;
    if (status) filter.status = status;

    // --- NEW: Hide registrations from teachers until registration period ends ---
    if (req.user.role === 'teacher' && course) {
      const courseObj = await Course.findById(course).populate('semester', 'registrationEndDate');
      if (courseObj && courseObj.semester) {
        const now = new Date();
        if (now < new Date(courseObj.semester.registrationEndDate)) {
          return res.json({
            registrations: [],
            pagination: { current: 1, pages: 0, total: 0 }
          });
        }
      }
    }

    const skip = (page - 1) * limit;

    let registrations = await Registration.find(filter)
      .populate('student', 'firstName lastName studentId email')
      .populate({
        path: 'course',
        select: 'subject classCode teacher schedule maxStudents currentStudents',
        populate: [
          { path: 'teacher', select: 'firstName lastName email' },
          { path: 'subject', select: 'subjectCode subjectName credits major yearLevel category' },
          // NEW: Populate classroom details within the schedule
          { path: 'schedule.classroom', select: 'roomCode' }
        ]
      })
      .populate('semester', 'name code academicYear')
      .populate('approvedBy', 'firstName lastName')
      .sort({ registrationDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use .lean() to get plain JS objects that can be modified

    const total = await Registration.countDocuments(filter);

    // --- CONFLICT DETECTION LOGIC ---
    if (req.user.role === 'student' && registrations.length > 1) {
        const scheduleMap = new Map();
        const subjectMap = new Map();

        registrations.forEach((reg, index) => {
            if (reg.course && reg.course.schedule) {
                reg.course.schedule.forEach(slot => {
                    const key = `${slot.dayOfWeek}-${slot.period}`;
                    if (!scheduleMap.has(key)) {
                        scheduleMap.set(key, []);
                    }
                    scheduleMap.get(key).push(index);
                });
            }
            if (reg.course && reg.course.subject) {
                const subjectId = reg.course.subject._id.toString();
                if (!subjectMap.has(subjectId)) {
                    subjectMap.set(subjectId, []);
                }
                subjectMap.get(subjectId).push(index);
            }
        });

        scheduleMap.forEach(indices => {
            if (indices.length > 1) {
                indices.forEach(i => {
                    registrations[i].hasConflict = true;
                });
            }
        });
        subjectMap.forEach(indices => {
            if (indices.length > 1) {
                indices.forEach(i => {
                    registrations[i].hasSubjectConflict = true;
                });
            }
        });
    }

    res.json({
      registrations,
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

// @route   POST /api/registrations
// @desc    Register for a course
// @access  Private (Students only)
router.post('/', [
  auth,
  body('courseId', 'Course ID is required').isMongoId(),
  body('semesterId', 'Semester ID is required').isMongoId()
], async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can register for courses' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, semesterId } = req.body;

    // Check if course exists and is active
    const course = await Course.findById(courseId).populate('subject', 'credits');
    if (!course || !course.isActive) {
      return res.status(400).json({ message: 'Course not found or inactive' });
    }

    // --- FIX: Check if the associated subject exists ---
    if (!course.subject) {
      return res.status(400).json({ message: 'Lỗi: Môn học của lớp này không tồn tại. Vui lòng liên hệ quản trị viên.' });
    }

    // Check if semester exists and registration is open (or course allows registration by its own deadline)
    const semester = await Semester.findById(semesterId);
    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }

    if (!semester.isRegistrationOpen()) {
      return res.status(400).json({ message: 'Semester not found or registration closed' });
    }

    // Check for existing registrations for the same SUBJECT in the same semester
    const studentRegistrationsInSemester = await Registration.find({
      student: req.user.id,
      semester: semesterId
    }).populate({
      path: 'course',
      select: 'subject classCode schedule', // Add 'schedule' here
      populate: {
        path: 'subject',
        select: 'subjectName _id' // IMPORTANT: Ensure _id is selected for comparison
      }
    });

    const newCourseSubjectId = course.subject._id.toString();

    for (const reg of studentRegistrationsInSemester) {
      // --- FIX: Add a check to ensure reg.course is not null ---
      // This handles cases where a previously registered course was deleted.
      if (!reg.course) continue;

      const isSameSubject = reg.course.subject && reg.course.subject._id.toString() === newCourseSubjectId;

      if (isSameSubject && reg.status === 'approved') {
        return res.status(400).json({ message: `Bạn đã được duyệt cho lớp ${reg.course.classCode} của môn này. Không thể đăng ký hoặc đổi lớp.` });
      }

      // If it's a different section of the same subject and is still pending, offer to switch.
      if (isSameSubject) { // This now covers both previous pending and reverted-approved
        // If it's the exact same course section, it's a straightforward duplicate
        if (reg.course._id.toString() === courseId) {
          return res.status(400).json({ message: 'Bạn đã đăng ký lớp học phần này rồi.' });
        }
        return res.status(409).json({
          message: `Bạn đã đăng ký lớp ${reg.course.classCode} cho môn học này. Bạn có muốn đổi sang lớp này không?`,
          conflictType: 'SUBJECT_DUPLICATE',
          existingRegistrationId: reg._id,
        });
      }
    }

    // Check if course is full
    if (course.isFull()) {
      return res.status(400).json({ message: 'Course is full' });
    }

    // Check if student has enough credits available
    const student = await User.findById(req.user.id);
    if (student.currentCredits + course.subject.credits > student.maxCredits) {
      return res.status(400).json({
        message: `Cannot register. Would exceed maximum credits (${student.maxCredits})`
      });
    }

    // Check for schedule conflicts with existing registrations
    // Re-use the studentRegistrationsInSemester from the check above, as it contains all necessary registrations
    // (all are now in 'pending' state if registration is open)

    for (const newScheduleItem of course.schedule) {
      // Filter for registrations that are not the one we are trying to switch from
      // --- FIX: Filter out registrations with null courses before checking for conflicts ---
      const validExistingRegs = studentRegistrationsInSemester.filter(r => r.course && r.course._id.toString() !== courseId);

      for (const existingReg of validExistingRegs) {
        for (const existingScheduleItem of existingReg.course.schedule) {
          if (
            newScheduleItem.dayOfWeek === existingScheduleItem.dayOfWeek &&
            newScheduleItem.period === existingScheduleItem.period
          ) {
            return res.status(400).json({ message: `Trùng lịch học với môn "${existingReg.course.subject.subjectName}" (Cùng thứ, cùng ca).` });
          }
        }
      }
    }

    // Check prerequisites
    if (course.prerequisites && course.prerequisites.length > 0) {
      const completedCourses = await Registration.find({
        student: req.user.id,
        status: 'completed',
        'grade.finalGrade': { $in: ['A', 'B+', 'B', 'C+', 'C'] }
      }).populate('course');

      const completedCourseIds = completedCourses.map(r => r.course._id.toString());
      const missingPrerequisites = course.prerequisites.filter(
        prereq => !completedCourseIds.includes(prereq.toString())
      );

      if (missingPrerequisites.length > 0) {
        const prereqCourses = await Course.find({ _id: { $in: missingPrerequisites } });
        return res.status(400).json({
          message: 'Prerequisites not met',
          missingPrerequisites: prereqCourses.map(c => ({ id: c._id, code: c.courseCode, name: c.courseName }))
        });
      }
    }

    // Create registration
    const registration = new Registration({
      student: req.user.id,
      course: courseId,
      semester: semesterId,
      status: 'pending',
      paymentAmount: course.fee
    });

    await registration.save();


    // Populate fields for response
    await registration.populate([
      { path: 'student', select: 'firstName lastName studentId email' },
      { path: 'course', select: 'courseCode courseName credits' },
      { path: 'semester', select: 'name academicYear' }
    ]);

    res.json(registration);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/registrations/switch
// @desc    Switch from one course section to another of the same subject
// @access  Private (Students only)
router.post('/switch', [
  auth,
  body('oldRegistrationId', 'Old Registration ID is required').isMongoId(),
  body('newCourseId', 'New Course ID is required').isMongoId(),
], async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can switch courses' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { oldRegistrationId, newCourseId } = req.body;

  try {
    // 1. Find and validate the old registration
    const oldReg = await Registration.findById(oldRegistrationId).populate({
      path: 'course',
      populate: { path: 'subject', select: 'credits' }
    });

    if (!oldReg || oldReg.student.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Đăng ký cũ không hợp lệ.' });
    }

    // Security check: ensure the old registration belongs to the current user
    if (oldReg.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    if (oldReg.status !== 'pending') {
      return res.status(400).json({ message: 'Chỉ có thể đổi lớp khi đăng ký cũ đang ở trạng thái "Chờ duyệt".' });
    }

    // 2. Find and validate the new course
    const newCourse = await Course.findById(newCourseId).populate('subject', 'credits');
    if (!newCourse || newCourse.isFull()) {
      return res.status(400).json({ message: 'Lớp học phần mới không tồn tại hoặc đã đầy.' });
    }

    // --- FIX: Decrement student count for the old course if it was approved ---
    // This was the source of the negative student count bug.
    if (oldReg.status === 'approved') {
      await Course.findByIdAndUpdate(oldReg.course._id, { $inc: { currentStudents: -1 } });
      // Credits don't need to be adjusted as they are for the same subject.
    }

    // 3. Delete the old registration
    await Registration.findByIdAndDelete(oldRegistrationId);

    // 4. Create the new registration
    // The new registration will be 'pending' and won't affect the new course's student count until approved.
    const newReg = new Registration({
      student: req.user.id,
      course: newCourseId,
      semester: oldReg.semester,
      status: 'pending'
    });
    await newReg.save();

    // Note: Credit and student count updates are handled by post-save/delete hooks in the models.

    res.status(201).json({ message: 'Chuyển lớp thành công!', registration: newReg });
  } catch (error) {
    console.error('Switch course error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi chuyển lớp.' });
  }
});

// @route   PUT /api/registrations/:id/approve
// @desc    Approve a registration
// @access  Private (Admin/Teacher)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const registration = await Registration.findById(req.params.id)
      .populate({
        path: 'course',
        select: 'teacher', // Select the teacher field
        populate: {
          path: 'subject',
          select: 'credits'
        }
      }).populate('student'); // Also populate student for credit update

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Teachers can only approve registrations for their own courses
    if (req.user.role === 'teacher' && registration.course.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to approve this registration' });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({ message: 'Registration is not pending' });
    }

    registration.status = 'approved';
    registration.approvalDate = new Date();
    registration.approvedBy = req.user.id;

    await registration.save();

    // Atomically update course's student count and student's credit count
    await Course.findByIdAndUpdate(registration.course._id, { $inc: { currentStudents: 1 } });
    await User.findByIdAndUpdate(registration.student, {
      $inc: { currentCredits: registration.course.subject.credits }
    });

    // Populate fields for response
    await registration.populate([
      { path: 'student', select: 'firstName lastName studentId email' },
      { path: 'course', select: 'courseCode courseName credits' },
      { path: 'semester', select: 'name academicYear' },
      { path: 'approvedBy', select: 'firstName lastName' }
    ]);

    res.json(registration);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/registrations/:id/reject
// @desc    Reject a registration
// @access  Private (Admin/Teacher)
router.put('/:id/reject', [
  auth,
  body('reason', 'Rejection reason is required').not().isEmpty()
], async (req, res) => { // Note: No credit change needed here as it was never added for pending.
  try {
    // Check if user is admin or teacher
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;

    const registration = await Registration.findById(req.params.id)
      .populate('course', 'teacher'); // Populate only the teacher field on the course

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Teachers can only reject registrations for their own courses
    if (req.user.role === 'teacher' && registration.course.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reject this registration' });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({ message: 'Registration is not pending' });
    }

    // If a teacher rejects, it becomes a rejection request for the admin.
    // If an admin rejects, it's final.
    if (req.user.role === 'teacher') {
        registration.rejectionRequest = {
            requested: true,
            reason: reason
        };
    } else { // Admin
        registration.status = 'rejected';
        registration.rejectionReason = reason;
        registration.approvedBy = req.user.id;
    }

    registration.notes = `Rejected by ${req.user.role}: ${reason}`;

    await registration.save();

    // Populate fields for response
    await registration.populate([
      { path: 'student', select: 'firstName lastName studentId email' },
      { path: 'course', select: 'courseCode courseName credits' },
      { path: 'semester', select: 'name academicYear' }
    ]);

    res.json(registration);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/registrations/:id
// @desc    Drop a course
// @access  Private (Students only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can drop courses' });
    }

    const registration = await Registration.findById(req.params.id)
      .populate({
        path: 'course',
        populate: {
          path: 'subject',
          select: 'credits'
        }
      }).populate('semester');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Check if student owns this registration
    if (registration.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Students can only drop courses that are 'pending' or 'approved'.
    // You might want to add a check for the drop deadline here as well.
    if (registration.status !== 'pending' && registration.status !== 'approved') {
      return res.status(400).json({ message: `Không thể hủy đăng ký ở trạng thái "${registration.status}".` });
    }

    // Only decrease counts if the registration was approved
    if (registration.status === 'approved') {
      // Update course current students count
      await Course.findByIdAndUpdate(registration.course._id, { $inc: { currentStudents: -1 } });
      // Atomically update student's credit count
      await User.findByIdAndUpdate(req.user.id, { $inc: { currentCredits: -registration.course.subject.credits } });
    }

    // Delete the registration document entirely
    await Registration.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course dropped successfully' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/registrations/:id/grade
// @desc    Update grades for a registration
// @access  Private (Teacher/Admin)
router.put('/:id/grade', [
  auth,
  body('attendance').optional().isInt({ min: 0, max: 100 }),
  body('midterm').optional().isInt({ min: 0, max: 100 }),
  body('final').optional().isInt({ min: 0, max: 100 }),
  body('finalGrade').optional().isIn(['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'I', 'W'])
], async (req, res) => {
  try {
    // Check if user is admin or teacher
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attendance, midterm, final, finalGrade } = req.body;

    const registration = await Registration.findById(req.params.id)
      .populate('course');

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Teachers can only grade their own courses
    if (req.user.role === 'teacher' && registration.course.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to grade this registration' });
    }

    // Update grades
    if (attendance !== undefined) registration.grade.attendance = attendance;
    if (midterm !== undefined) registration.grade.midterm = midterm;
    if (final !== undefined) registration.grade.final = final;
    if (finalGrade !== undefined) registration.grade.finalGrade = finalGrade;

    // Calculate GPA if all grades are present
    if (attendance !== undefined && midterm !== undefined && final !== undefined) {
      const course = await Course.findById(registration.course._id);
      const totalScore = (attendance * course.gradingPolicy.attendance / 100) +
        (midterm * course.gradingPolicy.midterm / 100) +
        (final * course.gradingPolicy.final / 100);

      // Convert score to GPA (simplified)
      if (totalScore >= 90) registration.grade.gpa = 4.0;
      else if (totalScore >= 85) registration.grade.gpa = 3.7;
      else if (totalScore >= 80) registration.grade.gpa = 3.3;
      else if (totalScore >= 75) registration.grade.gpa = 3.0;
      else if (totalScore >= 70) registration.grade.gpa = 2.7;
      else if (totalScore >= 65) registration.grade.gpa = 2.3;
      else if (totalScore >= 60) registration.grade.gpa = 2.0;
      else registration.grade.gpa = 0.0;
    }

    await registration.save();

    // Populate fields for response
    await registration.populate([
      { path: 'student', select: 'firstName lastName studentId email' },
      { path: 'course', select: 'courseCode courseName credits' },
      { path: 'semester', select: 'name academicYear' }
    ]);

    res.json(registration);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 