const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  role:     { type: String, enum: ['owner', 'member'], default: 'owner' },

  // Bumped on password change / "sign out everywhere"; old sessions stop working.
  tokenVersion: { type: Number, default: 0 },

  // Brute-force protection
  failedLogins: { type: Number, default: 0, select: false },
  lockUntil:    { type: Date, select: false },

  // Password reset (only a SHA-256 hash of the emailed token is stored)
  resetTokenHash:    { type: String, select: false },
  resetTokenExpires: { type: Date, select: false },

  lastLoginAt: Date,
}, { timestamps: true });

userSchema.methods.toSafeJSON = function () {
  return { id: this._id, name: this.name, email: this.email, role: this.role, createdAt: this.createdAt };
};

module.exports = mongoose.model('User', userSchema);
