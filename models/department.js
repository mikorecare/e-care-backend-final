const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  dailyQuota: { type: Number, default: 50 }, // Default quota for appointments
  image: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now },
  },
});

module.exports = mongoose.model('Department', departmentSchema);