// models/TaskAllocation.js
import mongoose from 'mongoose';

const TaskAllocationSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  labour: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  allocatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.TaskAllocation || mongoose.model('TaskAllocation', TaskAllocationSchema);