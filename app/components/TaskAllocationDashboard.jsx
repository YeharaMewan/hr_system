// app/components/TaskAllocationDashboard.jsx
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
  CheckCircle2
} from 'lucide-react';

// Import task-related components
import { BulkTaskCreationForm, EditTaskForm, LabourAllocationForm } from './task';

const TaskAllocationDashboard = () => {
  // State management
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [currentTaskTitle, setCurrentTaskTitle] = useState('');

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([loadTasks(), loadUsers()]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load tasks with allocated labours
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      throw error;
    }
  };

  // Load users (leaders and labours)
  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  // Initialize dashboard
  useEffect(() => {
    loadAllData();
  }, []);

  // Handle task creation success
  const handleTasksCreated = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    loadTasks();
  };

  // Handle labour allocation success
  const handleLaboursAllocated = () => {
    setShowLabourModal(false);
    setCurrentTaskId(null);
    setCurrentTaskTitle('');
    loadTasks();
  };

  // Delete task
  const deleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) 
      return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadTasks();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task: ' + error.message);
    }
  };

  // Remove labour from task
  const removeLabour = async (allocationId) => {
    if (!confirm('Are you sure you want to remove this labour from the task?')) return;

    try {
      const response = await fetch(`/api/task-allocations/${allocationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadTasks();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error removing labour:', error);
      alert('Failed to remove labour: ' + error.message);
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
            onClick={loadAllData}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get filtered users
  const leaders = users.filter(user => user.role === 'leader');
  const labours = users.filter(user => user.role === 'labour');

  // Main render
  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Task Allocation Dashboard</h1>
          <p className="text-zinc-400">කාර්ය වෙන්කිරීම් සහ කම්කරු පවරාගැනීම</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-violet-600/20 rounded-lg">
                <Clock className="w-6 h-6 text-violet-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">Total Tasks</p>
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
                <p className="text-zinc-400 text-sm">Active Leaders</p>
                <p className="text-2xl font-bold text-white">{leaders.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">Available Labours</p>
                <p className="text-2xl font-bold text-white">{labours.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-600/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">Completed Tasks</p>
                <p className="text-2xl font-bold text-white">
                  {tasks.filter(task => task.status === 'Completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowTaskModal(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus size={20} />
            Create Multiple Tasks
          </button>
          
          <button
            onClick={loadAllData}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors border border-zinc-700"
          >
            <Loader size={20} />
            Refresh Data
          </button>
        </div>

        {/* Tasks Table */}
        <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
          <div className="overflow-x-auto">
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-zinc-400">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                        <p className="text-lg font-medium mb-2">No tasks found</p>
                        <p className="text-sm">Create your first task to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-zinc-800/50 transition-colors">
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
                            task.allocations.map((allocation) => (
                              <div key={allocation._id} className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-xs flex items-center">
                                <span className="text-zinc-300">{allocation.labour?.name || 'Unknown'}</span>
                                <span className="ml-1 text-zinc-500">
                                  ({allocation.labour?.skills?.join(', ') || 'General'})
                                </span>
                                <button
                                  onClick={() => removeLabour(allocation._id)}
                                  className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-zinc-500 text-xs">No labours assigned</span>
                          )}
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
                        </div>
                      </td>
                      
                      {/* Expected Man Days Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-zinc-300">
                          <Calendar size={16} className="mr-2 text-zinc-500" />
                          {task.expectedManDays} days
                        </div>
                      </td>
                      
                      {/* Actions Column */}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Components */}
        
        {/* Bulk Task Creation Form */}
        <BulkTaskCreationForm
          isOpen={showTaskModal && !editingTask}
          users={users}
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
      </div>
    </div>
  );
};

export default TaskAllocationDashboard;