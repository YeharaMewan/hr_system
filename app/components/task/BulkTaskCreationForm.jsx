// app/components/task/BulkTaskCreationForm.jsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader, X, AlertCircle, CheckCircle, Trash2, Users, UserCheck, Copy, Calendar, MapPin, Search, Filter } from 'lucide-react';
import Toast from '../ui/Toast';

const BulkTaskCreationForm = ({ 
  users = [], 
  onTasksCreated, 
  onCancel, 
  isOpen = false 
}) => {
  // ==================== STATE MANAGEMENT ====================
  const [leaderGroups, setLeaderGroups] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Search states
  const [leaderSearchTerms, setLeaderSearchTerms] = useState({}); // Per group search
  const [labourSearchTerms, setLabourSearchTerms] = useState({}); // Per task search

  // ==================== MEMOIZED VALUES ====================
  // Separate users by role
  const leaders = useMemo(() => users.filter(user => user.role === 'leader'), [users]);
  const labours = useMemo(() => users.filter(user => user.role === 'labour'), [users]);

  // Calculate total tasks
  const totalTasks = useMemo(() => {
    return leaderGroups.reduce((total, group) => total + group.tasks.length, 0);
  }, [leaderGroups]);

  // ==================== UTILITY FUNCTIONS ====================
  // Generate unique ID
  const generateId = () => Date.now() + Math.random();

  // Filter leaders based on search term for specific group
  const getFilteredLeaders = (groupId) => {
    const searchTerm = leaderSearchTerms[groupId] || '';
    if (!searchTerm) return leaders;
    
    return leaders.filter(leader => 
      leader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leader.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Filter labours based on search term for specific task
  const getFilteredLabours = (taskId) => {
    const searchTerm = labourSearchTerms[taskId] || '';
    if (!searchTerm) return labours;
    
    return labours.filter(labour => 
      labour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      labour.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (labour.skills && labour.skills.some(skill => 
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  };

  // ==================== FORM INITIALIZATION ====================
  // Initialize form with empty leader group
  const initializeForm = useCallback(() => {
    setLeaderGroups([
      {
        id: Date.now(),
        groupName: 'Leader Group 1',
        selectedLeaders: [],
        tasks: [
          {
            id: Date.now() + 1,
            title: '',
            location: '',
            expectedManDays: '', // Individual expected days per task
            priority: 'Medium',
            assignedLabours: [],
            notes: ''
          }
        ]
      }
    ]);
    setErrors({});
    setSuccessMessage('');
    setLeaderSearchTerms({});
    setLabourSearchTerms({});
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeForm();
    }
  }, [isOpen, initializeForm]);

  // ==================== SEARCH FUNCTIONS ====================
  // Update leader search term
  const updateLeaderSearch = (groupId, searchTerm) => {
    setLeaderSearchTerms(prev => ({
      ...prev,
      [groupId]: searchTerm
    }));
  };

  // Update labour search term
  const updateLabourSearch = (taskId, searchTerm) => {
    setLabourSearchTerms(prev => ({
      ...prev,
      [taskId]: searchTerm
    }));
  };

  // ==================== GROUP MANAGEMENT ====================
  // Add new leader group
  const addLeaderGroup = useCallback(() => {
    const newGroup = {
      id: generateId(),
      groupName: `Leader Group ${leaderGroups.length + 1}`,
      selectedLeaders: [],
      tasks: [
        {
          id: generateId(),
          title: '',
          location: '',
          expectedManDays: '', // Individual expected days per task
          priority: 'Medium',
          assignedLabours: [],
          notes: ''
        }
      ]
    };
    setLeaderGroups(prev => [...prev, newGroup]);
  }, [leaderGroups.length]);

  // Remove leader group
  const removeLeaderGroup = useCallback((groupId) => {
    setLeaderGroups(prev => {
      if (prev.length > 1) {
        return prev.filter(group => group.id !== groupId);
      }
      return prev;
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[groupId];
      return newErrors;
    });
  }, []);

  // Update leader group field
  const updateLeaderGroup = (groupId, field, value) => {
    setLeaderGroups(leaderGroups.map(group => 
      group.id === groupId ? { ...group, [field]: value } : group
    ));
    
    // Clear error for this field
    if (errors[groupId]?.[field]) {
      setErrors(prev => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          [field]: null
        }
      }));
    }
  };

  // Duplicate leader group
  const duplicateLeaderGroup = (groupId) => {
    const groupToDuplicate = leaderGroups.find(g => g.id === groupId);
    if (groupToDuplicate) {
      const newGroup = {
        ...groupToDuplicate,
        id: generateId(),
        groupName: groupToDuplicate.groupName + ' (Copy)',
        tasks: groupToDuplicate.tasks.map(task => ({
          ...task,
          id: generateId(),
          title: task.title + ' (Copy)',
          expectedManDays: task.expectedManDays // Keep the individual expected days
        }))
      };
      setLeaderGroups([...leaderGroups, newGroup]);
    }
  };

  // ==================== LEADER ASSIGNMENT ====================
  // Toggle leader assignment to group
  const toggleLeaderAssignment = (groupId, leaderId) => {
    setLeaderGroups(leaderGroups.map(group => {
      if (group.id === groupId) {
        const isAssigned = group.selectedLeaders.includes(leaderId);
        return {
          ...group,
          selectedLeaders: isAssigned 
            ? group.selectedLeaders.filter(id => id !== leaderId)
            : [...group.selectedLeaders, leaderId]
        };
      }
      return group;
    }));
  };

  // ==================== TASK MANAGEMENT ====================
  // Add task to leader group
  const addTaskToGroup = (groupId) => {
    setLeaderGroups(leaderGroups.map(group => {
      if (group.id === groupId) {
        const newTask = {
          id: generateId(),
          title: '',
          location: '',
          expectedManDays: '', // Individual expected days per task
          priority: 'Medium',
          assignedLabours: [],
          notes: ''
        };
        return {
          ...group,
          tasks: [...group.tasks, newTask]
        };
      }
      return group;
    }));
  };

  // Remove task from group
  const removeTaskFromGroup = (groupId, taskId) => {
    setLeaderGroups(leaderGroups.map(group => {
      if (group.id === groupId && group.tasks.length > 1) {
        return {
          ...group,
          tasks: group.tasks.filter(task => task.id !== taskId)
        };
      }
      return group;
    }));
  };

  // Update task in group
  const updateTaskInGroup = (groupId, taskId, field, value) => {
    setLeaderGroups(leaderGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: group.tasks.map(task => 
            task.id === taskId ? { ...task, [field]: value } : task
          )
        };
      }
      return group;
    }));
  };

  // ==================== LABOUR ASSIGNMENT ====================
  // Toggle labour assignment to task
  const toggleLabourAssignment = (groupId, taskId, labourId) => {
    setLeaderGroups(leaderGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: group.tasks.map(task => {
            if (task.id === taskId) {
              const isAssigned = task.assignedLabours.includes(labourId);
              return {
                ...task,
                assignedLabours: isAssigned 
                  ? task.assignedLabours.filter(id => id !== labourId)
                  : [...task.assignedLabours, labourId]
              };
            }
            return task;
          })
        };
      }
      return group;
    }));
  };

  // ==================== FORM VALIDATION ====================
  const validateForm = () => {
    const newErrors = {};

    leaderGroups.forEach(group => {
      const groupErrors = {};

      if (group.selectedLeaders.length === 0) {
        groupErrors.selectedLeaders = 'At least one leader must be selected';
      }

      // Validate tasks in group
      const taskErrors = {};
      group.tasks.forEach(task => {
        const taskErrorsForTask = {};

        if (!task.title.trim()) {
          taskErrorsForTask.title = 'Task title is required';
        }

        if (!task.location.trim()) {
          taskErrorsForTask.location = 'Location is required';
        }

        if (!task.expectedManDays || task.expectedManDays < 1) {
          taskErrorsForTask.expectedManDays = 'Expected man days must be at least 1';
        }

        if (Object.keys(taskErrorsForTask).length > 0) {
          taskErrors[task.id] = taskErrorsForTask;
        }
      });

      if (Object.keys(taskErrors).length > 0) {
        groupErrors.tasks = taskErrors;
      }

      if (Object.keys(groupErrors).length > 0) {
        newErrors[group.id] = groupErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== FORM SUBMISSION ====================
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      // Prepare tasks for submission
      const tasksToCreate = [];
      
      leaderGroups.forEach(group => {
        group.tasks.forEach(task => {
          // Create task for primary leader (first in selection)
          tasksToCreate.push({
            title: task.title,
            description: `Group: ${group.groupName}`,
            location: task.location,
            expectedManDays: parseInt(task.expectedManDays), // Use individual task expected days
            assignedLeader: group.selectedLeaders[0], // Primary leader
            priority: task.priority,
            notes: task.notes,
            assignedLabours: task.assignedLabours,
            groupInfo: {
              groupName: group.groupName,
              allLeaders: group.selectedLeaders
            }
          });
        });
      });

      const response = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasksToCreate }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(`Successfully created ${data.tasks.length} tasks for ${leaderGroups.length} leader group(s)!`);
        showToast(`🎉 Successfully created ${data.tasks.length} tasks for ${leaderGroups.length} leader group(s)!`, 'success');
        
        if (onTasksCreated) {
          onTasksCreated(data.tasks);
        }

        setTimeout(() => {
          initializeForm();
          setSuccessMessage('');
          hideToast();
        }, 3000);

      } else {
        throw new Error(data.message || 'Failed to create tasks');
      }
    } catch (error) {
      console.error('Error creating tasks:', error);
      setErrors({ 
        submit: error.message || 'Failed to create tasks. Please try again.'
      });
      showToast('❌ Failed to create tasks: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show toast message
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  // Hide toast message
  const hideToast = () => {
    setToast({ show: false, message: '', type: 'success' });
  };

  // Handle cancel
  const handleCancel = () => {
    initializeForm();
    hideToast();
    if (onCancel) {
      onCancel();
    }
  };

  // ==================== RENDER GUARD ====================
  if (!isOpen) return null;

  // ==================== MAIN RENDER ====================
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        
        {/* ==================== HEADER ==================== */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-violet-600/20 rounded-lg">
                <UserCheck className="w-6 h-6 text-violet-400" />
              </div>
              Task Creation
            </h2>
            <p className="text-zinc-400 mt-1">Each task can have individual expected days and settings</p>
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
          {/* ==================== SUCCESS MESSAGE ==================== */}
          {successMessage && (
            <div className="bg-green-900/20 border border-green-500/30 text-green-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </div>
          )}

          {/* ==================== ERROR MESSAGE ==================== */}
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errors.submit}
            </div>
          )}

          {/* ==================== LEADER GROUPS ==================== */}
          <div className="space-y-8">
            {leaderGroups.map((group, groupIndex) => (
              <div key={group.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
                
                {/* Group Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={group.groupName}
                      onChange={(e) => updateLeaderGroup(group.id, 'groupName', e.target.value)}
                      className="bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white font-semibold focus:outline-none focus:border-violet-500"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Group Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicateLeaderGroup(group.id)}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded text-sm flex items-center gap-1 transition-colors"
                      disabled={isSubmitting}
                      title="Duplicate Group"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => addTaskToGroup(group.id)}
                      className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded text-sm flex items-center gap-1 transition-colors"
                      disabled={isSubmitting}
                    >
                      <Plus className="w-4 h-4" />
                      Add Task
                    </button>
                    
                    {leaderGroups.length > 1 && (
                      <button
                        onClick={() => removeLeaderGroup(group.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm flex items-center gap-1 transition-colors"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ==================== LEADERS SELECTION ==================== */}
                <div className="mb-6 p-4 bg-zinc-700 rounded-lg">
                  <div>
                    <label className="text-sm font-medium mb-3 text-zinc-300 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Leaders for this Group
                    </label>
                    
                    {/* Leader Search */}
                    <div className="mb-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          value={leaderSearchTerms[group.id] || ''}
                          onChange={(e) => updateLeaderSearch(group.id, e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-600 rounded pl-10 pr-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 text-sm"
                          placeholder="Search leaders by name or email..."
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Leaders List */}
                    <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {getFilteredLeaders(group.id).length === 0 ? (
                        <div className="text-center py-4">
                          {leaderSearchTerms[group.id] ? (
                            <p className="text-zinc-500 text-sm">No leaders found matching "{leaderSearchTerms[group.id]}"</p>
                          ) : (
                            <p className="text-zinc-500 text-sm">No leaders available</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getFilteredLeaders(group.id).map((leader) => (
                            <label key={leader._id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-zinc-700/50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={group.selectedLeaders.includes(leader._id)}
                                onChange={() => toggleLeaderAssignment(group.id, leader._id)}
                                className="rounded border-zinc-600 bg-zinc-700 text-violet-600 focus:ring-violet-500"
                                disabled={isSubmitting}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-zinc-300 font-medium">{leader.name}</div>
                                <div className="text-zinc-500 text-xs truncate">{leader.email}</div>
                                {leader.skills && leader.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {leader.skills.slice(0, 2).map((skill, index) => (
                                      <span key={index} className="bg-blue-900/20 text-blue-400 px-1 py-0.5 rounded text-xs">
                                        {skill}
                                      </span>
                                    ))}
                                    {leader.skills.length > 2 && (
                                      <span className="text-zinc-500 text-xs">+{leader.skills.length - 2} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected Leaders Summary */}
                    {group.selectedLeaders.length > 0 && (
                      <div className="mt-2 p-2 bg-violet-900/20 border border-violet-500/30 rounded">
                        <p className="text-violet-400 text-xs font-medium mb-1">
                          Selected Leaders ({group.selectedLeaders.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {group.selectedLeaders.map(leaderId => {
                            const leader = leaders.find(l => l._id === leaderId);
                            return leader ? (
                              <span key={leaderId} className="bg-violet-600 text-white px-2 py-1 rounded text-xs">
                                {leader.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    {errors[group.id]?.selectedLeaders && (
                      <p className="text-red-400 text-sm mt-2">{errors[group.id].selectedLeaders}</p>
                    )}
                  </div>
                </div>

                {/* ==================== TASKS IN GROUP ==================== */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white flex items-center gap-2">
                    <span className="bg-violet-600/20 text-violet-400 px-2 py-1 rounded text-sm">
                      {group.tasks.length}
                    </span>
                    Tasks in this Group
                  </h4>

                  {group.tasks.map((task, taskIndex) => (
                    <div key={task.id} className="bg-zinc-700 border border-zinc-600 rounded-lg p-4">
                      
                      {/* Task Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-md font-medium text-white">
                          Task #{taskIndex + 1}
                        </h5>
                        
                        {group.tasks.length > 1 && (
                          <button
                            onClick={() => removeTaskFromGroup(group.id, task.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            disabled={isSubmitting}
                            title="Remove Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Task Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        
                        {/* Task Title */}
                        <div>
                          <label className="block text-sm font-medium mb-2 text-zinc-300">
                            Task Title *
                          </label>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTaskInGroup(group.id, task.id, 'title', e.target.value)}
                            className={`w-full bg-zinc-800 border rounded px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 ${
                              errors[group.id]?.tasks?.[task.id]?.title ? 'border-red-500' : 'border-zinc-600'
                            }`}
                            placeholder="e.g., Maintenance Task"
                            disabled={isSubmitting}
                          />
                          {errors[group.id]?.tasks?.[task.id]?.title && (
                            <p className="text-red-400 text-xs mt-1">{errors[group.id].tasks[task.id].title}</p>
                          )}
                        </div>

                        {/* Location */}
                        <div>
                          <label className="block text-sm font-medium mb-2 text-zinc-300">
                            Location *
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                              type="text"
                              value={task.location}
                              onChange={(e) => updateTaskInGroup(group.id, task.id, 'location', e.target.value)}
                              className={`w-full bg-zinc-800 border rounded pl-10 pr-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 ${
                                errors[group.id]?.tasks?.[task.id]?.location ? 'border-red-500' : 'border-zinc-600'
                              }`}
                              placeholder="e.g., GH-01"
                              disabled={isSubmitting}
                            />
                          </div>
                          {errors[group.id]?.tasks?.[task.id]?.location && (
                            <p className="text-red-400 text-xs mt-1">{errors[group.id].tasks[task.id].location}</p>
                          )}
                        </div>

                        {/* Expected Man Days - Individual per task */}
                        <div>
                          <label className="block text-sm font-medium mb-2 text-zinc-300">
                            Expected Days *
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                              type="number"
                              value={task.expectedManDays}
                              onChange={(e) => updateTaskInGroup(group.id, task.id, 'expectedManDays', e.target.value)}
                              className={`w-full bg-zinc-800 border rounded pl-10 pr-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 ${
                                errors[group.id]?.tasks?.[task.id]?.expectedManDays ? 'border-red-500' : 'border-zinc-600'
                              }`}
                              placeholder="Enter days"
                              min="1"
                              disabled={isSubmitting}
                            />
                          </div>
                          {errors[group.id]?.tasks?.[task.id]?.expectedManDays && (
                            <p className="text-red-400 text-xs mt-1">{errors[group.id].tasks[task.id].expectedManDays}</p>
                          )}
                        </div>
                      </div>

                      {/* Priority and Notes Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        
                        {/* Priority */}
                        <div>
                          <label className="block text-sm font-medium mb-2 text-zinc-300">
                            Priority
                          </label>
                          <select
                            value={task.priority}
                            onChange={(e) => updateTaskInGroup(group.id, task.id, 'priority', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                            disabled={isSubmitting}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium mb-2 text-zinc-300">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={task.notes}
                            onChange={(e) => updateTaskInGroup(group.id, task.id, 'notes', e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500"
                            placeholder="Additional notes..."
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {/* ==================== LABOUR ASSIGNMENT ==================== */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-zinc-300">
                          Assign Labours ({task.assignedLabours.length} selected)
                        </label>
                        
                        {/* Labour Search */}
                        <div className="mb-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                              type="text"
                              value={labourSearchTerms[task.id] || ''}
                              onChange={(e) => updateLabourSearch(task.id, e.target.value)}
                              className="w-full bg-zinc-800 border border-zinc-600 rounded pl-10 pr-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 text-sm"
                              placeholder="Search labours by name, email or skills..."
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        {/* Labours List */}
                        <div className="bg-zinc-800 rounded border border-zinc-600 p-3 max-h-32 overflow-y-auto">
                          {getFilteredLabours(task.id).length === 0 ? (
                            <div className="text-center py-2">
                              {labourSearchTerms[task.id] ? (
                                <p className="text-zinc-500 text-sm">No labours found matching "{labourSearchTerms[task.id]}"</p>
                              ) : (
                                <p className="text-zinc-500 text-sm">No labours available</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {getFilteredLabours(task.id).map((labour) => (
                                <label key={labour._id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-zinc-700/50 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={task.assignedLabours.includes(labour._id)}
                                    onChange={() => toggleLabourAssignment(group.id, task.id, labour._id)}
                                    className="rounded border-zinc-600 bg-zinc-700 text-green-600 focus:ring-green-500"
                                    disabled={isSubmitting}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-zinc-300 font-medium">{labour.name}</div>
                                    <div className="text-zinc-500 text-xs truncate">{labour.email}</div>
                                    {labour.skills && labour.skills.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {labour.skills.slice(0, 3).map((skill, index) => (
                                          <span key={index} className="bg-green-900/20 text-green-400 px-1 py-0.5 rounded text-xs">
                                            {skill}
                                          </span>
                                        ))}
                                        {labour.skills.length > 3 && (
                                          <span className="text-zinc-500 text-xs">+{labour.skills.length - 3} more</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {task.assignedLabours.includes(labour._id) && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Selected Labours Summary */}
                        {task.assignedLabours.length > 0 && (
                          <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded">
                            <p className="text-green-400 text-xs font-medium mb-1">
                              Selected Labours ({task.assignedLabours.length}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {task.assignedLabours.map(labourId => {
                                const labour = labours.find(l => l._id === labourId);
                                return labour ? (
                                  <span key={labourId} className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                    {labour.name}
                                    <button
                                      type="button"
                                      onClick={() => toggleLabourAssignment(group.id, task.id, labourId)}
                                      className="hover:bg-green-700 rounded-full w-3 h-3 flex items-center justify-center ml-1"
                                      disabled={isSubmitting}
                                    >
                                      <X className="w-2 h-2" />
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ==================== ADD LEADER GROUP BUTTON ==================== */}
          <div className="mt-6 text-center">
            <button
              onClick={addLeaderGroup}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors border border-zinc-700"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4" />
              Add Another Leader Group
            </button>
          </div>

          {/* ==================== ACTION BUTTONS ==================== */}
          <div className="flex justify-between items-center pt-6 border-t border-zinc-800 mt-8">
            <div className="text-sm text-zinc-400">
              {leaderGroups.length} leader group(s) • {totalTasks} total task(s) ready to create
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleCancel}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || totalTasks === 0}
                className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {isSubmitting && <Loader size={16} className="animate-spin" />}
                {isSubmitting ? 'Creating Tasks...' : `Create ${totalTasks} Task(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={hideToast}
        duration={5000}
      />
    </div>
  );
};

export default BulkTaskCreationForm;