const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  description: String,
  date: { type: Date, required: true },
  newPatient: { type: String, enum: ['new', 'old'], required: true }, // New field
  hospitalNo: { type: String, required: function () { return this.newPatient === 'old'; } }, // Conditional field
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' },
  lastname: String,
  firstname: String,
  middlename: String,
  age: Number,
  gender: { type: String, enum: ['male', 'female'], required: true },
  patientStatus: { type: String, enum: ['Single', 'Married', 'Separated', 'Widow/Widower'], required: true },
  address: String,
  mobileNumber: String,
  dateOfBirth: Date,
  placeOfBirth: String,
  gurdian: String,
  Occupation: String,
  notificationSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
