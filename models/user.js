const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Define user schema
const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String, required: true },
  image: {
    filename: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    uploadDate: { type: Date, default: Date.now },
  },
  role: { type: String, enum: ['admin', 'staff', 'patient'], default: 'patient' },
  resetPasswordToken: { type: String }, // Add reset token field
  resetPasswordExpires: { type: Date }, // Add token expiry field
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password for login
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex'); // Generate raw token
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex'); // Hash token for storage
  this.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
  return resetToken; // Return raw token for email
};

module.exports = mongoose.model('User', userSchema);

