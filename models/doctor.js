const mongoose = require('mongoose');

// Create a schema for doctors
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  image: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now },
  },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true }], // Array of departments
});

module.exports = mongoose.model('Doctor', doctorSchema);

