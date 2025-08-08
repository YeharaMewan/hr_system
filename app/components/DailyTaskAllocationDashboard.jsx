// app/components/DailyTaskAllocationDashboard.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  MapPin, 
  Calendar, 
  X, 
  Loader, 
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Save,
  BarChart3,
  TrendingUp
} from 'lucide-react';

// Import task-related components
import { BulkTaskCreationForm, EditTaskForm, LabourAllocationForm } from './task';
import Toast from '../components/ui/Toast';

const DailyTaskAllocationDashboard = () => {
  // State management
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [labours, setLabours] = useState([]); // Separate state for labours
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isToday, setIsToday] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [currentTaskTitle, setCurrentTaskTitle] = useState('');

  // Check if selected date is today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIsToday(selectedDate === today);
  }, [selectedDate]);

  // Fetch task allocation data for selected date
  const fetchTaskDataForDate = async (date) => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      
      if (date === today) {
        // Today's data - load live data
        await loadAllData(date);
      } else {
        // Historical data - try to get tasks for specific date first
        const tasksData = await loadTasksData(date);
        
        if (tasksData && tasksData.tasks && tasksData.tasks.length > 0) {
          // Found tasks created on this date, load all data normally
          setTasks(tasksData.tasks);
          await Promise.all([loadUsers(), loadLabours()]);
        } else {
          // No tasks found for this date, try to get from saved allocation records
          await fetchHistoricalTaskData(date);
        }
      }
    } catch (err) {
      setError('Failed to load task allocation data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load all live data (for today or specific date)
  const loadAllData = async (date = null) => {
    try {
      const results = await Promise.all([loadTasks(date), loadUsers(), loadLabours()]);
      return results;
    } catch (error) {
      throw error;
    }
  };

  // Load tasks data without setting state (for checking before fallback)
  const loadTasksData = async (date = null) => {
    try {
      const url = date ? `/api/tasks?date=${date}` : '/api/tasks';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  // Load tasks with allocated labours (filtered by date if historical)
  const loadTasks = async (date = null) => {
    try {
      const data = await loadTasksData(date);
      setTasks(data.tasks);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Load users (leaders and employees only)
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        // Filter out labours from users as they'll be loaded separately
        const nonLabourUsers = data.users.filter(user => user.role !== 'labour');
        setUsers(nonLabourUsers);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  // Load labours separately
  const loadLabours = async () => {
    try {
      const response = await fetch('/api/users/labours');
      const data = await response.json();
      
      if (data.success) {
        setLabours(data.labours);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw error;
    }
  };

  // Fetch historical task data
  const fetchHistoricalTaskData = async (date) => {
    try {
      const response = await fetch(`/api/task-allocations/daily?date=${date}`);
      const data = await response.json();
      
      if (data.success && data.record && data.record.taskAllocations && data.record.taskAllocations.length > 0) {
        
        // Convert historical data back to tasks format
        const historicalTasks = data.record.taskAllocations.map(taskAllocation => ({
          _id: taskAllocation.taskId || taskAllocation._id,
          title: taskAllocation.taskTitle,
          description: taskAllocation.taskDescription,
          status: taskAllocation.status,
          location: taskAllocation.location,
          expectedManDays: taskAllocation.expectedManDays,
          assignedLeader: taskAllocation.assignedLeader ? {
            _id: taskAllocation.assignedLeader.leaderId,
            name: taskAllocation.assignedLeader.leaderName,
            email: taskAllocation.assignedLeader.leaderEmail
          } : null,
          allocations: taskAllocation.allocatedLabours.map(labour => ({
            _id: labour.allocationId || labour._id,
            labour: {
              _id: labour.labourId,
              name: labour.labourName,
              email: labour.labourEmail,
              skills: labour.skills || []
            }
          }))
        }));
        
        setTasks(historicalTasks);
        
        // Set empty users array for historical data (as it's not editable)
        setUsers([]);
        
        // Set last saved time
        if (data.record.updatedAt) {
          setLastSaved(new Date(data.record.updatedAt));
        }
        
      } else {
        // No historical data found for this date
        setTasks([]);
        setUsers([]);
        setLastSaved(null);
      }
    } catch (err) {
      throw err;
    }
  };

  // Save task allocation data
  const saveDailyData = async () => {
    if (!isToday) {
      showToast('Historical data cannot be modified', 'warning');
      return;
    }

    try {
      setSaving(true);
      
      const dataToSave = {
        tasks: tasks,
        users: users,
        summary: {
          totalTasks: tasks.length,
          totalAllocatedLabours: tasks.reduce((total, task) => 
            total + (task.allocations ? task.allocations.length : 0), 0
          ),
          tasksByStatus: {
            pending: tasks.filter(task => task.status === 'Pending').length,
            inProgress: tasks.filter(task => task.status === 'In Progress').length,
            completed: tasks.filter(task => task.status === 'Completed').length,
            onHold: tasks.filter(task => task.status === 'On Hold').length
          },
          activeLeaders: leaders.length,
          availableLabours: labours.length
        },
        date: selectedDate
      };

      const response = await fetch('/api/task-allocations/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLastSaved(new Date());
          showToast('🎉 Task allocation data saved successfully!', 'success');
        }
      } else {
        throw new Error('Failed to save daily data');
      }
    } catch (err) {
      showToast('❌ Failed to save daily data: ' + err.message, 'error');
    } finally {
      setSaving(false);
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

  // Handle task creation success
  const handleTasksCreated = () => {
    if (!isToday) return;
    setShowTaskModal(false);
    setEditingTask(null);
    loadTasks(selectedDate); // Reload today's tasks with date filter
  };

  // Handle labour allocation success
  const handleLaboursAllocated = () => {
    if (!isToday) return;
    setShowLabourModal(false);
    setCurrentTaskId(null);
    setCurrentTaskTitle('');
    loadTasks(selectedDate); // Reload today's tasks with date filter
  };

  // Delete task
  const deleteTask = async (taskId) => {
    if (!isToday) {
      showToast('Historical data cannot be modified', 'warning');
      return;
    }

    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) 
      return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadTasks(selectedDate); // Reload tasks for current date (including today)
        showToast('Task deleted successfully', 'success');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showToast('Failed to delete task: ' + error.message, 'error');
    }
  };

  // Remove labour from task
  const removeLabour = async (allocationId) => {
    if (!isToday) {
      showToast('Historical data cannot be modified', 'warning');
      return;
    }

    if (!confirm('Are you sure you want to remove this labour from the task?')) return;

    try {
      const response = await fetch(`/api/task-allocations/${allocationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadTasks(selectedDate); // Reload tasks for current date (including today)
        showToast('Labour removed from task successfully', 'success');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      showToast('Failed to remove labour: ' + error.message, 'error');
    }
  };

  // Get status badge styling
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30';
      case 'In Progress':
        return 'bg-blue-900/20 text-blue-400 border border-blue-500/30';
      case 'Completed':
        return 'bg-green-900/20 text-green-400 border border-green-500/30';
      case 'On Hold':
        return 'bg-orange-900/20 text-orange-400 border border-orange-500/30';
      default:
        return 'bg-zinc-700 text-zinc-300 border border-zinc-600';
    }
  };

  // Date navigation functions
  const goToPreviousDay = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    setSelectedDate(prevDate.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    if (nextDate.toISOString().split('T')[0] <= today) {
      setSelectedDate(nextDate.toISOString().split('T')[0]);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Initialize dashboard
  useEffect(() => {
    fetchTaskDataForDate(selectedDate);
  }, [selectedDate]);

  // Get filtered users - need to fetch labours separately
  const leaders = users.filter(user => user.role === 'leader');
  // labours will be fetched separately from Labour model in useEffect

  // Helper function to get active leaders count from tasks
  const getActiveLeadersCount = () => {
    if (tasks.length === 0) return 0;
    
    const activeLeaderIds = new Set();
    tasks.forEach(task => {
      if (task.assignedLeader && task.assignedLeader._id) {
        activeLeaderIds.add(task.assignedLeader._id);
      }
    });
    return activeLeaderIds.size;
  };

  // Calculate statistics based on current tasks
  const totalAllocatedLabours = tasks.reduce((total, task) => 
    total + (task.allocations ? task.allocations.length : 0), 0
  );
  const completedTasks = tasks.filter(task => task.status === 'Completed').length;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[50vh] bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
          <p className="text-zinc-400">Loading task allocation dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-[50vh] bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchTaskDataForDate(selectedDate)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section with Date Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Task Allocation</h1>
            </div>
            <div className="flex items-center gap-4">
              {isToday && (
                <button
                  onClick={saveDailyData}
                  className={`flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors ${
                    saving ? 'opacity-75' : ''
                  }`}
                  disabled={saving}
                >
                  <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                  {saving ? 'Saving...' : 'Save Today\'s Data'}
                </button>
              )}
              {lastSaved && (
                <p className="text-xs text-zinc-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Date Navigation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={goToPreviousDay}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white"
                  />
                  {isToday && (
                    <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded text-sm border border-green-500/30">
                      Today
                    </span>
                  )}
                  {!isToday && (
                    <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm border border-blue-500/30">
                      Historical
                    </span>
                  )}
                </div>

                <button
                  onClick={goToNextDay}
                  disabled={selectedDate >= new Date().toISOString().split('T')[0]}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedDate >= new Date().toISOString().split('T')[0]
                      ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="flex items-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 px-3 py-2 rounded-lg transition-colors border border-violet-500/30"
                >
                  <Clock className="w-4 h-4" />
                  Today
                </button>
                
                <button
                  onClick={() => fetchTaskDataForDate(selectedDate)}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg transition-colors border border-zinc-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-violet-600/20 rounded-lg">
                <Clock className="w-6 h-6 text-violet-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">
                  {isToday ? 'Tasks Created Today' : `Tasks Created on ${new Date(selectedDate).toLocaleDateString()}`}
                </p>
                <p className="text-2xl font-bold text-white">{tasks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">
                  {isToday ? 'Active Leaders Today' : `Active Leaders on ${new Date(selectedDate).toLocaleDateString()}`}
                </p>
                <p className="text-2xl font-bold text-white">{getActiveLeadersCount()}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">
                  {isToday ? 'Labours Allocated Today' : `Labours Allocated on ${new Date(selectedDate).toLocaleDateString()}`}
                </p>
                <p className="text-2xl font-bold text-white">{totalAllocatedLabours}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-600/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">
                  {isToday ? 'Tasks Completed Today' : `Tasks Completed on ${new Date(selectedDate).toLocaleDateString()}`}
                </p>
                <p className="text-2xl font-bold text-white">{completedTasks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (only for today) */}
        {isToday && (
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setShowTaskModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <Plus size={20} />
              Create Multiple Tasks
            </button>
            
            <button
              onClick={() => fetchTaskDataForDate(selectedDate)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors border border-zinc-700"
            >
              <Loader size={20} />
              Refresh Data
            </button>
          </div>
        )}

        {/* Tasks Table */}
        <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white flex items-center">
                <BarChart3 className="w-6 h-6 mr-2 text-violet-400" />
                {isToday 
                  ? 'Tasks Created Today' 
                  : `Tasks Created on ${new Date(selectedDate).toLocaleDateString()}`
                }
              </h2>
              {!isToday && (
                <p className="text-sm text-zinc-400 mt-2">
                  Showing tasks that were created on {new Date(selectedDate).toLocaleDateString()}
                </p>
              )}
            </div>          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800 border-b border-zinc-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Task Details
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Allocated Labours
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Duration
                  </th>
                  {isToday && (
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={isToday ? "6" : "5"} className="px-6 py-12 text-center">
                      <div className="text-zinc-400">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                        <p className="text-lg font-medium mb-2">
                          {isToday 
                            ? 'No tasks found for today' 
                            : `No data found for ${new Date(selectedDate).toLocaleDateString()}`
                          }
                        </p>
                        <p className="text-sm">
                          {isToday 
                            ? 'Create your first task to get started' 
                            : 'No tasks were created on this date and no saved allocation records were found. Try selecting a different date or create new tasks for today.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task, taskIndex) => (
                    <tr key={task._id || `task-${taskIndex}`} className="hover:bg-zinc-800/50 transition-colors">
                      {/* Status Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      
                      {/* Task Details Column */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-zinc-400 mt-1 max-w-xs truncate">
                            {task.description}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 mt-1">
                          Leader: {task.assignedLeader?.name || 'Unassigned'}
                        </div>
                      </td>
                      
                      {/* Location Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-zinc-300">
                          <MapPin size={16} className="mr-2 text-zinc-500" />
                          {task.location}
                        </div>
                      </td>
                      
                      {/* Labour Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {task.allocations && task.allocations.length > 0 ? (
                            task.allocations.map((allocation, index) => (
                              <div key={allocation._id || `${task._id}-allocation-${index}`} className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-xs flex items-center">
                                <span className="text-zinc-300">{allocation.labour?.name || 'Unknown'}</span>
                                <span className="ml-1 text-zinc-500">
                                  ({allocation.labour?.skills?.join(', ') || 'General'})
                                </span>
                                {isToday && (
                                  <button
                                    onClick={() => removeLabour(allocation._id)}
                                    className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-zinc-500 text-xs">No labours assigned</span>
                          )}
                          {isToday && (
                            <button
                              onClick={() => {
                                setCurrentTaskId(task._id);
                                setCurrentTaskTitle(task.title);
                                setShowLabourModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center transition-colors"
                            >
                              <Plus size={12} className="mr-1" />
                              Add Labour
                            </button>
                          )}
                        </div>
                      </td>
                      
                      {/* Expected Man Days Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-zinc-300">
                          <Calendar size={16} className="mr-2 text-zinc-500" />
                          {task.expectedManDays} days
                        </div>
                      </td>
                      
                      {/* Actions Column (only for today) */}
                      {isToday && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setShowTaskModal(true);
                              }}
                              className="text-yellow-400 hover:text-yellow-300 transition-colors p-1"
                              title="Edit Task"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteTask(task._id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title="Delete Task"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Components (only for today) */}
        {isToday && (
          <>
            {/* Bulk Task Creation Form */}
            <BulkTaskCreationForm
              isOpen={showTaskModal && !editingTask}
              users={users}
              labours={labours}
              onTasksCreated={handleTasksCreated}
              onCancel={() => setShowTaskModal(false)}
            />

            {/* Edit Task Form */}
            <EditTaskForm
              isOpen={showTaskModal && editingTask}
              task={editingTask}
              leaders={leaders}
              onTaskUpdated={handleTasksCreated}
              onCancel={() => {
                setShowTaskModal(false);
                setEditingTask(null);
              }}
            />

            {/* Labour Allocation Form */}
            <LabourAllocationForm
              isOpen={showLabourModal}
              labours={labours}
              taskId={currentTaskId}
              taskTitle={currentTaskTitle}
              existingAllocations={tasks.find(task => task._id === currentTaskId)?.allocations || []}
              onLaboursAllocated={handleLaboursAllocated}
              onCancel={() => setShowLabourModal(false)}
            />
          </>
        )}
      </div>
      
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={hideToast}
        duration={4000}
      />
    </div>
  );
};

export default DailyTaskAllocationDashboard;
