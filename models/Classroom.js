const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
    building: {
        type: Number,
        required: [true, 'Số tòa nhà là bắt buộc'],
        min: 1,
        max: 8,
    },
    floor: {
        type: Number,
        required: [true, 'Số tầng là bắt buộc'],
        min: 1,
        max: 7,
    },
    roomNumber: {
        type: Number,
        required: [true, 'Số phòng là bắt buộc'],
        min: 1,
        max: 6,
    },
    roomCode: {
        type: String,
        unique: true,
        uppercase: true,
    },
    roomType: {
        type: String,
        required: [true, 'Loại phòng là bắt buộc'],
        enum: ['computer_lab', 'regular', 'lecture_hall'],
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
}, {
    timestamps: true
});

// Middleware để tự động tạo roomCode trước khi lưu
ClassroomSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('building') || this.isModified('floor') || this.isModified('roomNumber')) {
        this.roomCode = `A${this.building}-${this.floor}0${this.roomNumber}`;
    }
    next();
});

// Đảm bảo roomCode là duy nhất
ClassroomSchema.index({ building: 1, floor: 1, roomNumber: 1 }, { unique: true });

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