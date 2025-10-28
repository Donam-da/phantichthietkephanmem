const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator'); // Thêm dòng này
const Subject = require('../models/Subject');
const School = require('../models/School'); // Import School model
const Course = require('../models/Course'); // Import Course model
const { auth } = require('../middleware/auth');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const { admin } = require('../middleware/admin');
const multer = require('multer'); // Giữ lại multer
const fs = require('fs');

const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files

// @route   POST api/subjects
// @desc    Tạo môn học mới
// @access  Private (Admin)
router.post('/', [
    auth,
    admin,
    body('subjectCode', 'Mã môn học là bắt buộc').not().isEmpty(),
    body('subjectName', 'Tên môn học là bắt buộc').not().isEmpty(),
    body('credits', 'Số tín chỉ là bắt buộc và phải là số').isInt({ min: 0 }),
    body('schools', 'Vui lòng chọn ít nhất một trường').isArray({ min: 1 }),
    body('category', 'Loại môn học là bắt buộc').isIn(['required', 'elective', 'general']),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { subjectCode, subjectName, credits, schools, category } = req.body;
    try {
        if (!schools || schools.length === 0) {
            return res.status(400).json({ msg: 'Vui lòng chọn ít nhất một trường' });
        }

        let subject = await Subject.findOne({ subjectCode });
        if (subject) {
            return res.status(400).json({ msg: 'Mã môn học đã tồn tại' });
        }

        subject = new Subject({ subjectCode, subjectName, credits, schools, category });
        await subject.save();
        await subject.populate('schools', 'schoolCode schoolName');
        res.status(201).json(subject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   GET api/subjects
// @desc    Lấy tất cả môn học
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const subjects = await Subject.find().populate('schools', 'schoolCode schoolName').sort({ subjectCode: 1 });
        res.json(subjects);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   PUT api/subjects/:id
// @desc    Cập nhật thông tin môn học
// @access  Private (Admin)
router.put('/:id', [
    auth,
    admin,
    body('subjectName', 'Tên môn học là bắt buộc').optional().not().isEmpty(),
    body('credits', 'Số tín chỉ là bắt buộc và phải là số').optional().isInt({ min: 0 }),
    body('schools', 'Vui lòng chọn ít nhất một trường').optional().isArray({ min: 1 }),
    body('category', 'Loại môn học là bắt buộc').optional().isIn(['required', 'elective', 'general']),    
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { subjectName, credits, schools, category } = req.body;
    try {
        let subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ msg: 'Không tìm thấy môn học' });

        // Chỉ cập nhật các trường được cung cấp trong request body
        if (subjectName) subject.subjectName = subjectName;
        if (credits !== undefined) subject.credits = credits;
        if (schools) subject.schools = schools;
        if (category) subject.category = category;

        await subject.save();
        await subject.populate('schools', 'schoolCode schoolName');
        res.json(subject);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/subjects/:id
// @desc    Xóa một môn học
// @access  Private (Admin)
// Thêm middleware verifyAdminPassword
router.delete('/:id', [auth, admin, verifyAdminPassword], async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject) return res.status(404).json({ msg: 'Không tìm thấy môn học' });

        // Tự động xóa tất cả các lớp học phần liên quan đến môn học này
        await Course.deleteMany({ subject: req.params.id });
        // Sau đó xóa môn học
        await Subject.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Đã xóa môn học thành công' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   DELETE api/subjects
// @desc    Xóa nhiều môn học cùng lúc
// @access  Private (Admin)
// Thêm middleware verifyAdminPassword
router.delete('/', [auth, admin, verifyAdminPassword], async (req, res) => {
    const { subjectIds } = req.body;

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp danh sách ID môn học cần xóa.' });
    }

    try {
        // Tự động xóa tất cả các lớp học phần liên quan đến các môn học này
        await Course.deleteMany({ subject: { $in: subjectIds } });
        const result = await Subject.deleteMany({ _id: { $in: subjectIds } });
        res.json({ msg: `Đã xóa thành công ${result.deletedCount} môn học.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi Server');
    }
});

// @route   POST api/subjects/import
// @desc    Import subjects from CSV file
// @access  Private (Admin)
router.post('/import', [auth, admin, upload.single('file')], async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'Vui lòng tải lên một tệp.' });
    }

    const errors = [];
    const importedSubjects = [];
    const schoolMap = new Map(); // To map schoolCode to _id

    try {
        // Fetch all schools to create a mapping
        const allSchools = await School.find().select('_id schoolCode');
        allSchools.forEach(s => schoolMap.set(s.schoolCode.toUpperCase(), s._id));

        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const rows = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

        // Bỏ qua dòng tiêu đề
        const dataRows = rows.slice(1);

        for (const row of dataRows) {
            const parts = row.split(',');
            if (parts.length < 5) {
                errors.push({ row, msg: 'Dòng không đủ 5 cột dữ liệu bắt buộc.' });
                continue;
            }

            // Tách 5 cột đầu tiên
            const subjectCode = parts[0].trim();
            const subjectName = parts[1].trim();
            const credits = parts[2].trim();
            const schoolCodesStr = parts[3].trim();
            const category = parts[4].trim();

            // Basic validation
            if (!subjectCode || !subjectName || !credits || !schoolCodesStr || !category) {
                errors.push({ row, msg: 'Thiếu thông tin bắt buộc (subjectCode, subjectName, credits, schools, category).' });
                continue;
            }

            // Validate credits
            const parsedCredits = parseInt(credits, 10);
            if (isNaN(parsedCredits) || parsedCredits <= 0) {
                errors.push({ row, msg: `Số tín chỉ '${credits}' không hợp lệ.` });
                continue;
            }

            // Validate category
            const validCategories = ['required', 'elective', 'general'];
            if (!validCategories.includes(category.toLowerCase())) {
                errors.push({ row, msg: `Loại môn học '${category}' không hợp lệ. Phải là 'required', 'elective' hoặc 'general'.` });
                continue;
            }

            // Map school codes to IDs
            const schoolCodes = schoolCodesStr.split(';').map(s => s.trim().toUpperCase());
            const schoolIds = [];
            let allSchoolsFound = true;
            for (const code of schoolCodes) {
                if (schoolMap.has(code)) {
                    schoolIds.push(schoolMap.get(code));
                } else {
                    errors.push({ row, msg: `Mã trường '${code}' không tồn tại.` });
                    allSchoolsFound = false;
                    break;
                }
            }
            if (!allSchoolsFound) continue;

            // Check for duplicate subject code
            let existingSubject = await Subject.findOne({ subjectCode });
            if (existingSubject) {
                errors.push({ row, msg: `Mã môn học '${subjectCode}' đã tồn tại.` });
                continue;
            }

            try {
                const newSubject = new Subject({
                    subjectCode,
                    subjectName,
                    credits: parsedCredits,
                    schools: schoolIds,
                    category: category.toLowerCase()
                });
                await newSubject.save();
                importedSubjects.push(newSubject);
            } catch (dbErr) {
                errors.push({ row, msg: `Lỗi lưu vào DB: ${dbErr.message}` });
            }
        }

        // Clean up the uploaded file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting uploaded file:', err);
        });

        res.json({
            msg: `Đã xử lý ${dataRows.length} dòng. Thêm thành công ${importedSubjects.length} môn học.`,
            processedCount: dataRows.length,
            importedCount: importedSubjects.length,
            failedCount: errors.length,
            errors: errors
        });

    } catch (err) {
        console.error(err.message);
        // Clean up the uploaded file in case of early error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
            });
        }
        res.status(500).send('Lỗi Server');
    }
});

module.exports = router;