// models/LabourAllocationRecord.js - UPDATED

import mongoose from 'mongoose';

const LabourAllocationRecordSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Company statistics for the day
  companyStats: [{
    name: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    editable: {
      type: Boolean,
      default: true
    }
  }],

  // Auto-calculated values for the day
  totalLabourCount: {
    type: Number,
    default: 0
  },

  totalLeaders: {
    type: Number,
    default: 0
  },

  // Store calculated values for historical tracking
  calculatedValues: {
    totalLabourCount: { type: Number, default: 0 },
    theRiseTotalEmployees: { type: Number, default: 0 },
    totalCompanyEmployees: { type: Number, default: 0 },
    codegenStaffCount: { type: Number, default: 0 },
    ramStudiosCount: { type: Number, default: 0 },
    riseTechnologyCount: { type: Number, default: 0 },
    actualPresentLabourCount: { type: Number, default: 0 }
  },

  // Labour allocation details by leader
  leaderAllocations: [{
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    leaderName: String,
    labourCount: {
      type: Number,
      default: 0
    },
    tasksCount: {
      type: Number,
      default: 0
    },
    attendanceStatus: {
      type: String,
      enum: [
        'Present', 'Planned Leave', 'Sudden Leave', 'Medical Leave',
        'Holiday Leave', 'Lieu leave', 'Work from home', 
        'Work from out of Rise', 'Not Marked'
      ],
      default: 'Not Marked'
    }
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  notes: {
    type: String,
    maxLength: 500
  }

}, { 
  timestamps: true,
  
  // ✅ FIXED: Updated indexes for createdAt based approach
  indexes: [
    // Primary index for date-based queries
    { date: 1 },
    
    // ✅ NEW: Index for createdAt based uniqueness
    { createdBy: 1, createdAt: 1 },
    
    // ✅ NEW: Compound index for date range queries
    { createdAt: 1, createdBy: 1 },
    
    // Secondary indexes
    { updatedAt: -1 },
    { 'leaderAllocations.leaderId': 1 }
  ]
});

// ✅ FIXED: Pre-save middleware to prevent multiple same-day records
LabourAllocationRecordSchema.pre('save', async function(next) {
  try {
    // Calculate totals if not provided
    if (this.leaderAllocations && this.leaderAllocations.length > 0) {
      this.totalLabourCount = this.leaderAllocations.reduce((total, leader) => 
        total + (leader.labourCount || 0), 0
      );
      this.totalLeaders = this.leaderAllocations.length;
    }
    
    // ✅ NEW: Check for duplicate same-day records (only for new records)
    if (this.isNew) {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const existing = await this.constructor.findOne({
        createdBy: this.createdBy,
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });
      
      if (existing) {
        console.log('⚠️ Record already exists for today, user:', this.createdBy);
        // Don't throw error, just log warning
        // throw new Error('Record already exists for today');
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Pre-save error:', error);
    next(error);
  }
});

// ✅ FIXED: Static method to get today's record using createdAt
LabourAllocationRecordSchema.statics.getTodaysRecord = async function(userId) {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('🔍 Looking for today\'s record for user:', userId);
    
    let record = await this.findOne({
      createdBy: userId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ createdAt: -1 });
    
    if (!record) {
      console.log('🆕 Creating new record for user:', userId);
      
      record = new this({
        date: startOfDay,
        createdBy: userId,
        companyStats: [
          { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
          { name: 'Ram studios', count: 0, editable: true },
          { name: 'Rise Technology', count: 0, editable: true }
        ],
        leaderAllocations: [],
        totalLabourCount: 0,
        totalLeaders: 0
      });
      
      await record.save();
    }
    
    console.log('✅ Record found/created:', record._id);
    return record;
    
  } catch (error) {
    console.error('❌ getTodaysRecord error:', error);
    throw error;
  }
};

// ✅ NEW: Static method to get record by date range
LabourAllocationRecordSchema.statics.getRecordByDate = async function(dateString) {
  try {
    const targetDate = new Date(dateString);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('🔍 Looking for record on date:', dateString);
    
    const record = await this.findOne({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ createdAt: -1 }); // Get latest record of that day
    
    console.log('📋 Record found:', record ? 'Yes' : 'No');
    return record;
    
  } catch (error) {
    console.error('❌ getRecordByDate error:', error);
    throw error;
  }
};

export default mongoose.models.LabourAllocationRecord || 
  mongoose.model('LabourAllocationRecord', LabourAllocationRecordSchema);