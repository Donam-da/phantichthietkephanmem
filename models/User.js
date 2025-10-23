const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    studentId: {
        type: String,
        unique: true,
        sparse: true // Only unique if not null
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: function () {
            return this.role === 'student';
        }
    },
    gpa: {
        type: Number,
        default: 0,
        min: 0,
        max: 4
    },
    currentCredits: {
        type: Number,
        default: 0,
        min: 0
    },
    maxCredits: {
        type: Number,
        default: 24,
        min: 0
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    avatar: {
        type: String // URL to profile image
    }
}, {
    timestamps: true
});

// Index for better query performance
UserSchema.index({ role: 1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate student ID for new students
UserSchema.pre('save', async function (next) {
    if (this.role === 'student' && !this.studentId && this.isNew) {
        try {
            const currentYear = new Date().getFullYear();
            const lastStudent = await this.constructor.findOne(
                { studentId: { $regex: `^${currentYear}` } },
                {},
                { sort: { studentId: -1 } }
            );

            let nextNumber = 1;
            if (lastStudent && lastStudent.studentId) {
                const lastNumber = parseInt(lastStudent.studentId.slice(-4));
                nextNumber = lastNumber + 1;
            }

            this.studentId = `${currentYear}${nextNumber.toString().padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model('User', UserSchema);
