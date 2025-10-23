const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    dayOfWeek: { type: Number, required: true, min: 2, max: 8 }, // 2: Monday, ..., 8: Sunday
    period: { type: Number, required: true, min: 1, max: 4 }, // Ca 1, 2, 3, 4
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true }
}, { _id: false });

const CourseSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    classCode: {
        type: String, // e.g., N01, N02
        required: true,
        trim: true,
        uppercase: true,
    },
    maxStudents: {
        type: Number,
        required: true,
        min: 1
    },
    semester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Semester',
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    schedule: [ScheduleSchema],
    currentStudents: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, {
  timestamps: true
});

// Indexes for better query performance
CourseSchema.index({ subject: 1, semester: 1, classCode: 1 }, { unique: true });
CourseSchema.index({ semester: 1 });
CourseSchema.index({ teacher: 1 });

// Virtual for available spots
CourseSchema.virtual('availableSpots').get(function() {
  return this.maxStudents - this.currentStudents;
});

// Check if course is full
CourseSchema.methods.isFull = function() {
  return this.currentStudents >= this.maxStudents;
};

// Ensure virtual fields are serialized
CourseSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Course', CourseSchema);
