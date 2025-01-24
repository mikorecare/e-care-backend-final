const mongoose = require('mongoose');
const { Schema } = mongoose;

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User providing feedback
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true }, // Department being reviewed
    rate: { type: Number, min: 1, max: 5, required: true },
    comments: { type: String, required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true }, // Link to the appointment
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
