const mongoose = require('mongoose');

const ChangeRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestType: {
        type: String,
        enum: ['change_school'],
        required: true
    },
    currentValue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    requestedValue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNotes: {
        type: String
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ChangeRequest', ChangeRequestSchema);