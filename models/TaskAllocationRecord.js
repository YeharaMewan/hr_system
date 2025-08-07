// models/TaskAllocationRecord.js
import mongoose from 'mongoose';

const TaskAllocationRecordSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Task allocation details for the day
  taskAllocations: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    taskTitle: String,
    taskDescription: String,
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'On Hold'],
      default: 'Pending'
    },
    location: String,
    expectedManDays: {
      type: Number,
      default: 1
    },
    assignedLeader: {
      leaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      leaderName: String,
      leaderEmail: String
    },
    allocatedLabours: [{
      allocationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskAllocation'
      },
      labourId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      labourName: String,
      labourEmail: String,
      skills: [String]
    }],
    labourCount: {
      type: Number,
      default: 0
    }
  }],

  // Summary statistics for the day
  summary: {
    totalTasks: {
      type: Number,
      default: 0
    },
    totalAllocatedLabours: {
      type: Number,
      default: 0
    },
    tasksByStatus: {
      pending: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      onHold: { type: Number, default: 0 }
    },
    activeLeaders: {
      type: Number,
      default: 0
    },
    availableLabours: {
      type: Number,
      default: 0
    }
  },

  // Additional metrics
  metrics: {
    averageLaboursPerTask: {
      type: Number,
      default: 0
    },
    averageManDaysPerTask: {
      type: Number,
      default: 0
    },
    totalExpectedManDays: {
      type: Number,
      default: 0
    }
  },

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

// Pre-save middleware to calculate summary statistics
TaskAllocationRecordSchema.pre('save', function(next) {
  if (this.taskAllocations && this.taskAllocations.length > 0) {
    // Calculate summary statistics
    this.summary.totalTasks = this.taskAllocations.length;
    this.summary.totalAllocatedLabours = this.taskAllocations.reduce((total, task) => 
      total + (task.labourCount || 0), 0
    );

    // Count tasks by status
    this.summary.tasksByStatus = {
      pending: this.taskAllocations.filter(task => task.status === 'Pending').length,
      inProgress: this.taskAllocations.filter(task => task.status === 'In Progress').length,
      completed: this.taskAllocations.filter(task => task.status === 'Completed').length,
      onHold: this.taskAllocations.filter(task => task.status === 'On Hold').length
    };

    // Count unique leaders
    const uniqueLeaders = new Set();
    this.taskAllocations.forEach(task => {
      if (task.assignedLeader && task.assignedLeader.leaderId) {
        uniqueLeaders.add(task.assignedLeader.leaderId.toString());
      }
    });
    this.summary.activeLeaders = uniqueLeaders.size;

    // Calculate metrics
    const totalManDays = this.taskAllocations.reduce((total, task) => 
      total + (task.expectedManDays || 0), 0
    );
    
    this.metrics.totalExpectedManDays = totalManDays;
    this.metrics.averageLaboursPerTask = this.summary.totalTasks > 0 
      ? (this.summary.totalAllocatedLabours / this.summary.totalTasks) 
      : 0;
    this.metrics.averageManDaysPerTask = this.summary.totalTasks > 0 
      ? (totalManDays / this.summary.totalTasks) 
      : 0;
  }
  
  next();
});

// Static method to get or create today's record
TaskAllocationRecordSchema.statics.getTodaysRecord = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let record = await this.findOne({ date: today });
  
  if (!record) {
    record = new this({
      date: today,
      createdBy: userId,
      taskAllocations: [],
      summary: {
        totalTasks: 0,
        totalAllocatedLabours: 0,
        tasksByStatus: {
          pending: 0,
          inProgress: 0,
          completed: 0,
          onHold: 0
        },
        activeLeaders: 0,
        availableLabours: 0
      },
      metrics: {
        averageLaboursPerTask: 0,
        averageManDaysPerTask: 0,
        totalExpectedManDays: 0
      }
    });
    await record.save();
  }
  
  return record;
};

// Instance method to update task allocations
TaskAllocationRecordSchema.methods.updateTaskAllocations = async function(tasks, users, labours) {
  // Extract leaders from users, labours passed separately
  const leaders = users.filter(user => user.role === 'leader');
  // Use passed labours parameter instead of filtering from users

  this.taskAllocations = tasks.map(task => ({
    taskId: task._id,
    taskTitle: task.title,
    taskDescription: task.description,
    status: task.status,
    location: task.location,
    expectedManDays: task.expectedManDays,
    assignedLeader: task.assignedLeader ? {
      leaderId: task.assignedLeader._id || task.assignedLeader,
      leaderName: task.assignedLeader.name,
      leaderEmail: task.assignedLeader.email
    } : null,
    allocatedLabours: task.allocations ? task.allocations.map(allocation => ({
      allocationId: allocation._id,
      labourId: allocation.labour._id || allocation.labour,
      labourName: allocation.labour.name,
      labourEmail: allocation.labour.email,
      skills: allocation.labour.skills || []
    })) : [],
    labourCount: task.allocations ? task.allocations.length : 0
  }));

  // Set available labours count
  this.summary.availableLabours = labours.length;
  
  this.updatedAt = new Date();
  return await this.save();
};

export default mongoose.models.TaskAllocationRecord || 
  mongoose.model('TaskAllocationRecord', TaskAllocationRecordSchema);
