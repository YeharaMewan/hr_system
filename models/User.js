// models/User.js - Updated with skills field
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name.'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
  },
  role: {
    type: String,
    enum: ['leader', 'employee', 'hr'],
    default: 'employee',
  },
  skills: {
    type: [String],
    default: function() {
      // Set default skills based on role
      if (this.role === 'leader') {
        return ['Management']; // Default skill for leaders
      } else if (this.role === 'employee') {
        return ['General']; // Default skill for employees
      } else if (this.role === 'hr') {
        return ['HR Management']; // Default skill for HR
      }
      return [];
    }
  },
  // Additional fields for future use
  phoneNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Pre-save middleware to set default skills if not provided
UserSchema.pre('save', function(next) {
  if (!this.skills || this.skills.length === 0) {
    if (this.role === 'employee') {
      this.skills = ['General'];
    } else if (this.role === 'leader') {
      this.skills = ['Management'];
    } else if (this.role === 'hr') {
      this.skills = ['HR Management'];
    }
  }
  next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);