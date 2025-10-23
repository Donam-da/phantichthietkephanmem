const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    subjectCode: {
        type: String,
        required: [true, 'Mã môn học là bắt buộc'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    subjectName: {
        type: String,
        required: [true, 'Tên môn học là bắt buộc'],
        trim: true,
    },
    credits: {
        type: Number,
        required: [true, 'Số tín chỉ là bắt buộc'],
        min: 1,
        max: 10,
    },
    schools: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
    }],
}, {
    timestamps: true
});

module.exports = mongoose.model('Subject', SubjectSchema);