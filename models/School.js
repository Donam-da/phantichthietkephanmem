// models/School.js
const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
    schoolCode: {
        type: String,
        required: [true, 'Mã trường là bắt buộc'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    schoolName: {
        type: String,
        required: [true, 'Tên trường là bắt buộc'],
        trim: true,
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('School', SchoolSchema);
