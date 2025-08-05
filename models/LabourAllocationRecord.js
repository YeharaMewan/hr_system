// models/LabourAllocationRecord.js
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
    riseTechnologyCount: { type: Number, default: 0 }
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
  // Ensure only one record per date per user
  indexes: [
    { date: 1, createdBy: 1 }
  ]
});

// Pre-save middleware to ensure data consistency
LabourAllocationRecordSchema.pre('save', function(next) {
  // Calculate totals if not provided
  if (this.leaderAllocations && this.leaderAllocations.length > 0) {
    this.totalLabourCount = this.leaderAllocations.reduce((total, leader) => 
      total + (leader.labourCount || 0), 0
    );
    this.totalLeaders = this.leaderAllocations.length;
  }
  
  next();
});

// Static method to get or create today's record
LabourAllocationRecordSchema.statics.getTodaysRecord = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let record = await this.findOne({ date: today, createdBy: userId });
  
  if (!record) {
    record = new this({
      date: today,
      createdBy: userId,
      companyStats: [
        { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
        { name: 'Ram studios', count: 0, editable: true },
        { name: 'Rise Technology', count: 0, editable: true }
      ]
    });
    await record.save();
  }
  
  return record;
};

  // Instance method to update labour allocations
  LabourAllocationRecordSchema.methods.updateLabourAllocations = async function(labourData, attendanceData = []) {
    // Create attendance map for quick lookup
    const attendanceMap = {};
    attendanceData.forEach(record => {
      attendanceMap[record.userId || record.id] = record.status || record.attendanceStatus;
    });

    this.leaderAllocations = labourData.map(leader => ({
      leaderId: leader.id,
      leaderName: leader.name,
      labourCount: leader.labourCount,
      tasksCount: leader.tasksCount,
      attendanceStatus: attendanceMap[leader.id] || leader.attendanceStatus || 'Not Marked'
    }));
    
    // Recalculate totals
    this.totalLabourCount = this.leaderAllocations.reduce((total, leader) => 
      total + leader.labourCount, 0
    );
    this.totalLeaders = this.leaderAllocations.length;
    
    this.updatedAt = new Date();
    return await this.save();
  };export default mongoose.models.LabourAllocationRecord || 
  mongoose.model('LabourAllocationRecord', LabourAllocationRecordSchema);