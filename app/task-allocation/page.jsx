// app/dashboard/task-allocation/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

// Define a placeholder for the attendance status color
const getAttendanceColor = (status) => {
  // This is a placeholder. You will need to implement logic to get the actual attendance status.
  const colors = {
    Present: 'bg-green-500',
    'Planned Leave': 'bg-yellow-500',
    'Sudden Leave': 'bg-red-500',
  };
  return colors[status] || 'bg-gray-500'; // Default color
};

export default function TaskAllocationPage() {
  const { data: session, status } = useSession();
  const [leaders, setLeaders] = useState([]);
  const [labourers, setLabourers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    description: '',
    leader: '',
    labourers: [],
    location: '',
    manDays: 0,
  });

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Task Allocation...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Fetch leaders and labourers
        const fetchUsers = async () => {
          // In a real application, you would fetch this from an API endpoint
          const mockLeaders = [
            { _id: 'leader1', name: 'Leader A', attendanceStatus: 'Present' },
            { _id: 'leader2', name: 'Leader B', attendanceStatus: 'Sudden Leave' },
          ];
          const mockLabourers = [
            { _id: 'labourer1', name: 'Labourer One', skill: 'Welder' },
            { _id: 'labourer2', name: 'Labourer Two', skill: 'Carpenter' },
          ];
          setLeaders(mockLeaders);
          setLabourers(mockLabourers);
        };

        // Fetch existing tasks
        const fetchTasks = async () => {
          // This would also come from your API
          const mockTasks = [
            { _id: 'task1', description: 'Initial Task', leader: 'leader1', labourers: ['labourer1'], location: 'Site A', manDays: 5 },
          ];
          setTasks(mockTasks);
        };

        await Promise.all([fetchUsers(), fetchTasks()]);
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    // Only initialize data if session is available
    if (session) {
      initializeData();
    }
  }, [session]);

  const handleAddTask = () => {
    if (newTask.description && newTask.leader && newTask.manDays > 0) {
      setTasks([...tasks, { ...newTask, _id: `task${tasks.length + 1}` }]);
      setNewTask({ description: '', leader: '', labourers: [], location: '', manDays: 0 });
    }
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task._id !== taskId));
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading task allocation data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Task Allocation to Labour</h1>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Add New Task</h2>
        {/* Task Creation Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Leader Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Leader</label>
            <select
              value={newTask.leader}
              onChange={(e) => setNewTask({ ...newTask, leader: e.target.value })}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a Leader</option>
              {leaders.map(leader => (
                <option key={leader._id} value={leader._id}>{leader.name}</option>
              ))}
            </select>
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Expected Task</label>
            <input
              type="text"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Laborer Allocation */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Allocate Labourers</label>
            <select
              multiple
              value={newTask.labourers}
              onChange={(e) => setNewTask({ ...newTask, labourers: [...e.target.selectedOptions].map(o => o.value) })}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            >
              {labourers.map(labourer => (
                <option key={labourer._id} value={labourer._id}>{labourer.name} ({labourer.skill})</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={newTask.location}
              onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Man-Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Expected Man-Days</label>
            <input
              type="number"
              value={newTask.manDays}
              onChange={(e) => setNewTask({ ...newTask, manDays: Number(e.target.value) })}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <button
          onClick={handleAddTask}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Add Task
        </button>
      </div>

      {/* Task Table */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Current Tasks</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Leader</th>
                <th className="py-2 px-4 border-b">Expected Task</th>
                <th className="py-2 px-4 border-b">Allocated Labourers</th>
                <th className="py-2 px-4 border-b">Location</th>
                <th className="py-2 px-4 border-b">Man-Days</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task._id}>
                  <td className="py-2 px-4 border-b">
                    <div className="flex items-center">
                      {leaders.find(l => l._id === task.leader)?.name}
                      <span
                        className={`ml-2 h-3 w-3 rounded-full ${getAttendanceColor(leaders.find(l => l._id === task.leader)?.attendanceStatus)}`}
                      ></span>
                    </div>
                  </td>
                  <td className="py-2 px-4 border-b">{task.description}</td>
                  <td className="py-2 px-4 border-b">
                    {task.labourers.map(labourerId => 
                      <div key={labourerId}>{labourers.find(l => l._id === labourerId)?.name}</div>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">{task.location}</td>
                  <td className="py-2 px-4 border-b">{task.manDays}</td>
                  <td className="py-2 px-4 border-b">
                    <button className="text-blue-500 hover:underline">Edit</button>
                    <button onClick={() => handleDeleteTask(task._id)} className="text-red-500 hover:underline ml-2">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}