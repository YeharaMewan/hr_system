// app/components/task/EditTaskForm.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Edit, Loader, X, AlertCircle, CheckCircle, Calendar, MapPin, Users } from 'lucide-react';

const EditTaskForm = ({ 
  task = null,
  leaders = [], 
  onTaskUpdated, 
  onCancel, 
  isOpen = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    expectedManDays: '',
    assignedLeader: '',
    priority: 'Medium',
    status: 'Pending',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Priority options
  const priorityOptions = [
    { value: 'Low', label: 'Low', color: 'text-green-400' },
    { value: 'Medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'High', label: 'High', color: 'text-orange-400' },
    { value: 'Urgent', label: 'Urgent', color: 'text-red-400' }
  ];

  // Status options
  const statusOptions = [
    { value: 'Pending', label: 'Pending', color: 'text-yellow-400' },
    { value: 'In Progress', label: 'In Progress', color: 'text-blue-400' },
    { value: 'Completed', label: 'Completed', color: 'text-green-400' },
    { value: 'On Hold', label: 'On Hold', color: 'text-orange-400' }
  ];

  // Load task data when task prop changes
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        location: task.location || '',
        expectedManDays: task.expectedManDays || '',
        assignedLeader: task.assignedLeader?._id || task.assignedLeader || '',
        priority: task.priority || 'Medium',
        status: task.status || 'Pending',
        notes: task.notes || ''
      });
      setErrors({});
      setSuccessMessage('');
    }
  }, [task, isOpen]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.expectedManDays || formData.expectedManDays < 1) {
      newErrors.expectedManDays = 'Expected man days must be at least 1';
    }

    if (!formData.assignedLeader) {
      newErrors.assignedLeader = 'Please select a leader';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          expectedManDays: parseInt(formData.expectedManDays)
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('Task updated successfully!');
        
        // Call parent callback
        if (onTaskUpdated) {
          onTaskUpdated(data.task);
        }

        // Close modal after short delay
        setTimeout(() => {
          setSuccessMessage('');
        }, 2000);

      } else {
        throw new Error(data.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setErrors({ 
        submit: error.message || 'Failed to update task. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setErrors({});
    setSuccessMessage('');
    if (onCancel) {
      onCancel();
    }
  };

  // Don't render if not open
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-yellow-600/20 rounded-lg">
                <Edit className="w-6 h-6 text-yellow-400" />
              </div>
              Edit Task
            </h2>
            <p className="text-zinc-400 mt-1">Update task details and assignments</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-zinc-400 hover:text-white transition-colors p-2"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errors.submit}
            </div>
          )}

          <div className="space-y-6">
            {/* Task Title */}
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full bg-zinc-800 border rounded-lg px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors ${
                  errors.title ? 'border-red-500' : 'border-zinc-600'
                }`}
                placeholder="Enter task title"
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-red-400 text-sm mt-2">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 h-24 resize-none transition-colors"
                placeholder="Enter detailed task description..."
                disabled={isSubmitting}
              />
            </div>

            {/* Location and Expected Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">
                  Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full bg-zinc-800 border rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors ${
                      errors.location ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    placeholder="Enter work location"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.location && (
                  <p className="text-red-400 text-sm mt-2">{errors.location}</p>
                )}
              </div>

              {/* Expected Man Days */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">
                  Expected Days *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="number"
                    value={formData.expectedManDays}
                    onChange={(e) => setFormData({ ...formData, expectedManDays: e.target.value })}
                    className={`w-full bg-zinc-800 border rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors ${
                      errors.expectedManDays ? 'border-red-500' : 'border-zinc-600'
                    }`}
                    placeholder="Enter expected days"
                    min="1"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.expectedManDays && (
                  <p className="text-red-400 text-sm mt-2">{errors.expectedManDays}</p>
                )}
              </div>
            </div>

            {/* Assigned Leader, Priority, and Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Assigned Leader */}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  disabled={isSubmitting}
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  disabled={isSubmitting}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 h-24 resize-none transition-colors"
                placeholder="Any additional notes or instructions..."
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-zinc-800">
              <button
                onClick={handleCancel}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {isSubmitting && <Loader size={16} className="animate-spin" />}
                {isSubmitting ? 'Updating Task...' : 'Update Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskForm;