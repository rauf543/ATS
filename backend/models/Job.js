const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save
jobSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for the application management URL
jobSchema.virtual('applicationManagementUrl').get(function () {
    return `/job/${this._id}/applications`;
});

// Virtual for applications count
jobSchema.virtual('applicationsCount', {
    ref: 'Application',
    localField: '_id',
    foreignField: 'job',
    count: true
});

module.exports = mongoose.model('Job', jobSchema);