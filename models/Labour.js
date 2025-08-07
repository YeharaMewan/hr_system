// models/Labour.js - Separate model for labour workers
import mongoose from 'mongoose';

const LabourSchema = new mongoose.Schema({
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
    default: 'labour',
    immutable: true // This ensures the role is always 'labour'
  },
  skills: {
    type: [String],
    default: ['General'] // Default skill for labours
  },
  // Additional fields for labour workers
  phoneNumber: {
    type: String,
    trim: true
  },
  address: {
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
  },
  // Labour specific fields
  dailyWage: {
    type: Number,
    default: 0
  },
  availability: {
    type: String,
    enum: ['available', 'assigned', 'unavailable'],
    default: 'available'
  }
}, { 
  timestamps: true,
  collection: 'labour' // Explicitly set collection name to match your MongoDB collection
});

// Pre-save middleware to ensure default skills
LabourSchema.pre('save', function(next) {
  if (!this.skills || this.skills.length === 0) {
    this.skills = ['General'];
  }
  next();
});

export default mongoose.models.Labour || mongoose.model('Labour', LabourSchema);
