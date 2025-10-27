const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
    roomCode: {
        type: String,
        unique: true,
        uppercase: true,
    },
    roomType: {
        type: String,
        required: [true, 'Loại phòng là bắt buộc'],
        enum: ['theory', 'lab', 'computer_lab', 'lecture_hall'],
    },
    capacity: {
        type: Number,
        required: [true, 'Sức chứa là bắt buộc'],
        min: 1,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    scheduledEvents: [{ // An array of scheduled downtime periods
        deactivationTime: {
            type: Date,
            required: true
        },
        activationTime: {
            type: Date,
            required: true
        },
        notes: { type: String, trim: true }
    }],
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true
});

// Virtual để hiển thị tên loại phòng
ClassroomSchema.virtual('roomTypeName').get(function() {
    const types = {
        computer_lab: 'Phòng máy',
        regular: 'Phòng học thường',
        lecture_hall: 'Giảng đường',
    };
    return types[this.roomType];
});

module.exports = mongoose.model('Classroom', ClassroomSchema);