// app/components/task/LabourAllocationForm.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Users, Loader, X, AlertCircle, CheckCircle, Search, Filter, User, Award } from 'lucide-react';

const LabourAllocationForm = ({ 
  labours = [],
  taskId,
  taskTitle = '',
  existingAllocations = [],
  onLaboursAllocated, 
  onCancel, 
  isOpen = false 
}) => {
  const [selectedLabours, setSelectedLabours] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Get unique skills for filter
  const uniqueSkills = [...new Set(labours.flatMap(labour => labour.skills || ['General']))];

  // Filter out already allocated labours
  const existingLabourIds = existingAllocations.map(allocation => allocation.labour?._id);
  const availableLabours = labours.filter(labour => !existingLabourIds.includes(labour._id));

  // Apply filters and search
  const filteredLabours = availableLabours.filter(labour => {
    const matchesSearch = labour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         labour.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSkill = !skillFilter || (labour.skills && labour.skills.includes(skillFilter));
    
    const matchesStatus = !statusFilter || labour.status === statusFilter;

    return matchesSearch && matchesSkill && matchesStatus;
  });

  // Reset selections when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedLabours([]);
      setSearchTerm('');
      setSkillFilter('');
      setStatusFilter('');
      setErrors({});
      setSuccessMessage('');
    }
  }, [isOpen]);

  // Toggle labour selection
  const toggleLabour = (labourId) => {
    setSelectedLabours(prev => 
      prev.includes(labourId)
        ? prev.filter(id => id !== labourId)
        : [...prev, labourId]
    );
  };

  // Select all filtered labours
  const selectAllFiltered = () => {
    const allFilteredIds = filteredLabours.map(labour => labour._id);
    setSelectedLabours(allFilteredIds);
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedLabours([]);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (selectedLabours.length === 0) {
      newErrors.selection = 'Please select at least one labour to allocate';
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
      const response = await fetch('/api/task-allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          labourIds: selectedLabours
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(`Successfully allocated ${selectedLabours.length} labour(s) to the task!`);
        
        // Call parent callback
        if (onLaboursAllocated) {
          onLaboursAllocated(data.allocations);
        }

        // Close modal after short delay
        setTimeout(() => {
          setSuccessMessage('');
        }, 2000);

      } else {
        throw new Error(data.message || 'Failed to allocate labours');
      }
    } catch (error) {
      console.error('Error allocating labours:', error);
      setErrors({ 
        submit: error.message || 'Failed to allocate labours. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedLabours([]);
    setSearchTerm('');
    setSkillFilter('');
    setStatusFilter('');
    setErrors({});
    setSuccessMessage('');
    if (onCancel) {
      onCancel();
    }
  };

  // Get status badge styling
  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/20 text-green-400 border border-green-500/30';
      case 'on_leave':
        return 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30';
      case 'inactive':
        return 'bg-red-900/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-zinc-700 text-zinc-300 border border-zinc-600';
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              Allocate Labours
            </h2>
            <p className="text-zinc-400 mt-1">
              Assign labours to: <span className="text-white font-medium">{taskTitle}</span>
            </p>
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

          {/* Error Messages */}
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errors.submit}
            </div>
          )}

          {errors.selection && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errors.selection}
            </div>
          )}

          {/* Already Allocated Section */}
          {existingAllocations.length > 0 && (
            <div className="mb-6 p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-400" />
                Already Allocated ({existingAllocations.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {existingAllocations.map((allocation) => (
                  <div key={allocation._id} className="bg-zinc-700 border border-zinc-600 px-3 py-2 rounded-lg text-sm">
                    <span className="text-zinc-300">{allocation.labour?.name || 'Unknown'}</span>
                    <span className="text-zinc-500 ml-2">
                      ({allocation.labour?.skills?.join(', ') || 'General'})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="Search by name or email..."
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Skill Filter */}
            <div>
              <div className="relative">
                <Award className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  disabled={isSubmitting}
                >
                  <option value="">All Skills</option>
                  {uniqueSkills.map(skill => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  disabled={isSubmitting}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-6 p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
            <div className="text-zinc-300">
              <span className="font-medium">{selectedLabours.length}</span> of{' '}
              <span className="font-medium">{filteredLabours.length}</span> labours selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllFiltered}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                disabled={isSubmitting || filteredLabours.length === 0}
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                disabled={isSubmitting || selectedLabours.length === 0}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Labours List */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg max-h-96 overflow-y-auto">
            {filteredLabours.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 font-medium mb-2">No labours found</p>
                <p className="text-zinc-500 text-sm">
                  {availableLabours.length === 0 
                    ? 'All labours are already allocated to this task'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-700">
                {filteredLabours.map((labour) => (
                  <label
                    key={labour._id}
                    className={`flex items-center p-4 cursor-pointer hover:bg-zinc-700/50 transition-colors ${
                      selectedLabours.includes(labour._id) ? 'bg-violet-900/20' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLabours.includes(labour._id)}
                      onChange={() => toggleLabour(labour._id)}
                      className="rounded border-zinc-600 bg-zinc-700 text-violet-600 focus:ring-violet-500 mr-4"
                      disabled={isSubmitting}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-700 rounded-lg">
                            <User className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{labour.name}</p>
                            {labour.email && (
                              <p className="text-zinc-400 text-sm">{labour.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Skills */}
                          <div className="flex flex-wrap gap-1">
                            {(labour.skills || ['General']).map((skill, index) => (
                              <span
                                key={index}
                                className="bg-blue-900/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>

                          {/* Status */}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(labour.status)}`}>
                            {labour.status === 'active' ? 'Active' :
                             labour.status === 'on_leave' ? 'On Leave' :
                             labour.status === 'inactive' ? 'Inactive' : 
                             labour.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-zinc-800 mt-6">
            <button
              onClick={handleCancel}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedLabours.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {isSubmitting && <Loader size={16} className="animate-spin" />}
              {isSubmitting 
                ? 'Allocating...' 
                : `Allocate ${selectedLabours.length} Labour${selectedLabours.length !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabourAllocationForm;