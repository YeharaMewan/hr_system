// app/components/DailyLabourAllocationDashboard.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Building, 
  Loader, 
  AlertCircle, 
  UserCheck, 
  Settings, 
  Save, 
  Calendar,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Clock,
  BarChart3
} from 'lucide-react';
import Toast from '../components/ui/Toast';

const DailyLabourAllocationDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [labourData, setLabourData] = useState([]);
  const [companyStats, setCompanyStats] = useState([
    { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
    { name: 'Ram studios', count: 0, editable: true },
    { name: 'Rise Technology', count: 0, editable: true }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStats, setEditingStats] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isToday, setIsToday] = useState(true);
  
  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Cache for data to avoid repeated API calls
  const [dataCache, setDataCache] = useState({});

  // Attendance status colors
  const statusColors = {
    "Present": "bg-green-500/20 text-green-300 border-green-500/30",
    "Work from home": "bg-sky-500/20 text-sky-300 border-sky-500/30",
    "Planned Leave": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    "Sudden Leave": "bg-red-500/20 text-red-300 border-red-500/30",
    "Medical Leave": "bg-pink-500/20 text-pink-300 border-pink-500/30",
    "Holiday Leave": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    "Lieu leave": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    "Work from out of Rise": "bg-teal-500/20 text-teal-300 border-teal-500/30",
    "Not Marked": "bg-zinc-700/20 text-zinc-400 border-zinc-600/30",
    "Default": "bg-zinc-700/20 text-zinc-400 border-zinc-600/30"
  };

  // Get attendance status color class
  const getAttendanceStatusClass = (status) => {
    return statusColors[status] || statusColors.Default;
  };

  // Check if selected date is today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setIsToday(selectedDate === today);
  }, [selectedDate]);

  // Fetch labour allocation data for selected date
  const fetchLabourDataForDate = async (date) => {
    try {
      setLoading(true);
      setError(null);

      if (date === new Date().toISOString().split('T')[0]) {
        // Today's data - fetch live data
        await fetchLiveLabourData();
      } else {
        // Historical data - fetch from saved records
        await fetchHistoricalLabourData(date);
      }
    } catch (err) {
      console.error('Error fetching labour data:', err);
      setError('Failed to load labour allocation data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch live labour data (today's data)
  const fetchLiveLabourData = async () => {
    try {
      // Fetch tasks with allocations
      const tasksResponse = await fetch('/api/tasks');
      const tasksData = await tasksResponse.json();
      
      // Get today's attendance data for leaders
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await fetch(`/api/attendance/daily?date=${today}`);
      const attendanceData = await attendanceResponse.json();
      
      if (tasksData.success && attendanceData.success) {
        const leaders = attendanceData.leaders;
        
        // Calculate labour count for each leader
        const leaderLabourCount = leaders.map(leader => {
          const leaderTasks = tasksData.tasks.filter(task => {
            if (task.assignedLeader && task.assignedLeader._id) {
              return task.assignedLeader._id === leader._id;
            }
            if (task.leader && task.leader._id) {
              return task.leader._id === leader._id;
            }
            return task.assignedLeader === leader._id || task.leader === leader._id;
          });
          
          const totalLabours = leaderTasks.reduce((count, task) => {
            if (task.allocations && Array.isArray(task.allocations)) {
              return count + task.allocations.length;
            }
            return count;
          }, 0);
          
          return {
            id: leader._id,
            name: leader.name,
            email: leader.email,
            labourCount: totalLabours,
            tasksCount: leaderTasks.length,
            attendanceStatus: leader.attendanceStatus || 'Not Marked'
          };
        });
        
        leaderLabourCount.sort((a, b) => a.name.localeCompare(b.name));
        setLabourData(leaderLabourCount);
        
      } else {
        throw new Error(tasksData.message || attendanceData.message || 'Failed to fetch live data');
      }
    } catch (err) {
      throw err;
    }
  };

  // Fetch historical labour data
  const fetchHistoricalLabourData = async (date) => {
    try {
      // Get saved labour allocation record for the date
      const labourResponse = await fetch(`/api/labour-allocation/daily?date=${date}`);
      const labourData = await labourResponse.json();
      
      // Get attendance data for the specific date
      const attendanceResponse = await fetch(`/api/attendance/daily?date=${date}`);
      const attendanceData = await attendanceResponse.json();
      
      if (labourData.success && labourData.record) {
        // If we have saved labour allocation data, use it
        const historicalLabourData = labourData.record.leaderAllocations.map(allocation => {
          // Find corresponding attendance data for this leader
          const attendanceRecord = attendanceData.success && attendanceData.leaders 
            ? attendanceData.leaders.find(leader => leader._id.toString() === allocation.leaderId.toString())
            : null;
            
          return {
            id: allocation.leaderId,
            name: allocation.leaderName,
            email: allocation.leaderId?.email || 'N/A',
            labourCount: allocation.labourCount,
            tasksCount: allocation.tasksCount,
            attendanceStatus: attendanceRecord ? attendanceRecord.attendanceStatus : (allocation.attendanceStatus || 'Not Marked')
          };
        });
        
        setLabourData(historicalLabourData);
        
        // Set company stats if available
        if (labourData.record.companyStats) {
          setCompanyStats(labourData.record.companyStats);
        }
        
        // Set last saved time
        if (labourData.record.updatedAt) {
          setLastSaved(new Date(labourData.record.updatedAt));
        }
      } else if (attendanceData.success && attendanceData.leaders) {
        // If no saved labour allocation but we have attendance data, 
        // create basic structure with attendance status
        const basicLabourData = attendanceData.leaders.map(leader => ({
          id: leader._id,
          name: leader.name,
          email: leader.email,
          labourCount: 0,
          tasksCount: 0,
          attendanceStatus: leader.attendanceStatus
        }));
        
        setLabourData(basicLabourData);
        setCompanyStats([
          { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
          { name: 'Ram studios', count: 0, editable: true },
          { name: 'Rise Technology', count: 0, editable: true }
        ]);
      } else {
        // No data found for this date
        setLabourData([]);
        setCompanyStats([
          { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
          { name: 'Ram studios', count: 0, editable: true },
          { name: 'Rise Technology', count: 0, editable: true }
        ]);
      }
    } catch (err) {
      throw err;
    }
  };

  // Load saved company stats from API for specific date
  const loadCompanyStats = async (date = null) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // If it's today, get the latest company stats
      if (targetDate === new Date().toISOString().split('T')[0]) {
        const response = await fetch('/api/labour-allocation/company-stats');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            setCompanyStats(data.stats);
            if (data.record) {
              setLastSaved(new Date(data.record.updatedAt));
            }
            return;
          }
        }
      } else {
        // For historical dates, try to get saved labour allocation record
        const response = await fetch(`/api/labour-allocation/daily?date=${targetDate}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.record && data.record.companyStats) {
            setCompanyStats(data.record.companyStats);
            if (data.record.updatedAt) {
              setLastSaved(new Date(data.record.updatedAt));
            }
            return;
          }
        }
      }
      
      // Fallback to default values
      setCompanyStats([
        { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
        { name: 'Ram studios', count: 0, editable: true },
        { name: 'Rise Technology', count: 0, editable: true }
      ]);
      
    } catch (err) {
      console.error('Error loading company stats:', err);
      // Fallback to default values
      setCompanyStats([
        { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
        { name: 'Ram studios', count: 0, editable: true },
        { name: 'Rise Technology', count: 0, editable: true }
      ]);
    }
  };

  // Save company stats
  const saveCompanyStats = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/labour-allocation/company-stats', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stats: companyStats })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setLastSaved(new Date());
      } else {
        throw new Error(data.message || 'Failed to save to server');
      }
      
    } catch (err) {
      console.error('Error saving company stats:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save daily labour allocation data
  const saveDailyData = async () => {
    if (!isToday) {
      showToast('Historical data cannot be modified', 'warning');
      return;
    }

    try {
      setSaving(true);
      
      // Get current attendance data for today
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await fetch(`/api/attendance/daily?date=${today}`);
      const attendanceData = await attendanceResponse.json();
      
      const dataToSave = {
        labourData: labourData,
        companyStats: companyStats,
        calculatedValues: {
          totalLabourCount,
          theRiseTotalEmployees,
          totalCompanyEmployees,
          workingLeaderCount,
          codegenStaffCount,
          ramStudiosCount,
          riseTechnologyCount
        },
        date: selectedDate,
        // Include attendance data for proper historical tracking
        attendanceData: attendanceData.success ? attendanceData.leaders : null
      };

      const response = await fetch('/api/labour-allocation/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLastSaved(new Date());
          showToast('🎉 Labour allocation data saved successfully!', 'success');
        }
      } else {
        throw new Error('Failed to save daily data');
      }
    } catch (err) {
      console.error('Error saving daily data:', err);
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

  // Calculate metrics
  const totalLabourCount = labourData.reduce((total, leader) => total + leader.labourCount, 0);
  
  const calculateWorkingLeaderCount = () => {
    const workingStatuses = ['Present', 'Work from home', 'Work from out of Rise'];
    return labourData.filter(leader => 
      workingStatuses.includes(leader.attendanceStatus)
    ).length;
  };

  const workingLeaderCount = calculateWorkingLeaderCount();
  const codegenStaffCount = companyStats[0]?.count || 0;
  const theRiseTotalEmployees = totalLabourCount + codegenStaffCount + workingLeaderCount;
  const ramStudiosCount = companyStats[1]?.count || 0;
  const riseTechnologyCount = companyStats[2]?.count || 0;
  const totalCompanyEmployees = theRiseTotalEmployees + ramStudiosCount + riseTechnologyCount;

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

  // Update company stats
  const updateCompanyStat = (index, newCount) => {
    if (!isToday) {
      showToast('Historical data cannot be modified', 'warning');
      return;
    }
    const updatedStats = [...companyStats];
    updatedStats[index].count = parseInt(newCount) || 0;
    setCompanyStats(updatedStats);
  };

  // Handle editing company stats
  const handleEditStat = (index) => {
    if (!isToday) {
      showToast('Historical data cannot be modified', 'warning');
      return;
    }
    setEditingStats(prev => ({ ...prev, [index]: true }));
  };

  const handleSaveStat = (index) => {
    setEditingStats(prev => ({ ...prev, [index]: false }));
  };

  // useEffect hooks
  useEffect(() => {
    fetchLabourDataForDate(selectedDate);
    loadCompanyStats(selectedDate);
  }, [selectedDate]);

  // Auto-save with debounce (only for today's data)
  useEffect(() => {
    if (!isToday) return;
    
    const timeoutId = setTimeout(() => {
      if (companyStats.some(stat => stat.count > 0)) {
        saveCompanyStats();
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [companyStats, isToday]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading Labour Allocation Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Data</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => fetchLabourDataForDate(selectedDate)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header with Date Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Labour Allocation</h1>
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
                      Today - Live Data
                    </span>
                  )}
                  {!isToday && (
                    <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm border border-blue-500/30">
                      Historical Data
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
                  onClick={() => fetchLabourDataForDate(selectedDate)}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg transition-colors border border-zinc-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Information Message */}
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm">
                <strong>📅 Date-specific Data:</strong> {isToday ? 'Live attendance status and current task allocations are shown.' : `Historical data for ${new Date(selectedDate).toLocaleDateString()} including saved attendance status and company statistics.`}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-violet-600/20 rounded-lg">
                <Users className="w-6 h-6 text-violet-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">Active Leaders</p>
                <p className="text-2xl font-bold text-white">{labourData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">Labour Allocation</p>
                <p className="text-2xl font-bold text-white">{totalLabourCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-600/20 rounded-lg">
                <UserCheck className="w-6 h-6 text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">Working Leaders</p>
                <p className="text-2xl font-bold text-white">{workingLeaderCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Building className="w-6 h-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-zinc-400 text-sm">Company Total</p>
                <p className="text-2xl font-bold text-white">{totalCompanyEmployees}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Leaders & Labour Count with Attendance Status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <UserCheck className="w-6 h-6 mr-2 text-violet-400" />
                  Leaders & Employees ({new Date(selectedDate).toLocaleDateString()})
                </h2>
                <div className="bg-violet-600/20 px-3 py-1 rounded-full">
                  <span className="text-violet-400 text-sm font-medium">
                    Total: {totalLabourCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-4 font-medium text-zinc-300 bg-orange-600">
                        LEADERS
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-zinc-300 bg-orange-600">
                        EMPLOYEES
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {labourData.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="text-center py-8 text-zinc-400">
                          {isToday ? 'No leaders found or no tasks allocated' : 'No data available for this date'}
                        </td>
                      </tr>
                    ) : (
                      labourData.map((leader, index) => (
                        <tr 
                          key={leader.id || index} 
                          className={`border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-colors ${
                            leader.labourCount === 0 ? 'bg-red-900/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-white">{leader.name}</div>
                                <div className="text-xs text-zinc-400">{leader.email}</div>
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getAttendanceStatusClass(leader.attendanceStatus)}`}>
                                {leader.attendanceStatus}
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            <div className="font-bold text-lg text-white">
                              {leader.labourCount}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {leader.tasksCount} tasks
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    
                    {/* Total Row */}
                    <tr className="border-t-2 border-violet-600 bg-zinc-800/50">
                      <td className="py-4 px-4 font-bold text-violet-400">
                        TOTAL LABOUR COUNT
                      </td>
                      <td className="text-right py-4 px-4 font-bold text-2xl text-violet-400">
                        {totalLabourCount}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Side - Company Statistics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Building className="w-6 h-6 mr-2 text-blue-400" />
                  Company Statistics ({new Date(selectedDate).toLocaleDateString()})
                </h2>
                <div className="bg-blue-600/20 px-3 py-1 rounded-full">
                  <span className="text-blue-400 text-sm font-medium">
                    Total: {totalCompanyEmployees}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-4 font-medium text-zinc-300 bg-blue-600">
                        COMPANY/DEPARTMENT
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-zinc-300 bg-blue-600">
                        COUNT
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-zinc-300 bg-blue-600">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* First row - TOTAL LABOUR COUNT */}
                    <tr className="border-b border-zinc-700/50 bg-violet-900/20">
                      <td className="py-3 px-4 font-medium text-violet-400">
                        TOTAL LABOUR COUNT
                      </td>
                      <td className="text-right py-3 px-4 font-bold text-lg text-violet-400">
                        {totalLabourCount}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                          Auto
                        </span>
                      </td>
                    </tr>

                    {/* Second row - WORKING LEADERS COUNT */}
                    <tr className="border-b border-zinc-700/50 bg-orange-900/20">
                      <td className="py-3 px-4 font-medium text-orange-400">
                        WORKING LEADERS COUNT
                      </td>
                      <td className="text-right py-3 px-4 font-bold text-lg text-orange-400">
                        {workingLeaderCount}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                          Auto
                        </span>
                      </td>
                    </tr>

                    {/* Third row - Codegen + Aigrow staff's (editable) */}
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{companyStats[0]?.name}</div>
                      </td>
                      <td className="text-right py-3 px-4">
                        {editingStats[0] && isToday ? (
                          <input
                            type="number"
                            value={companyStats[0]?.count || 0}
                            onChange={(e) => updateCompanyStat(0, e.target.value)}
                            className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-right"
                            min="0"
                            autoFocus
                          />
                        ) : (
                          <div className="font-bold text-lg text-white">
                            {companyStats[0]?.count || 0}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {!editingStats[0] ? (
                          <button
                            onClick={() => handleEditStat(0)}
                            disabled={!isToday}
                            className={`p-1 transition-colors ${
                              isToday 
                                ? 'text-blue-400 hover:text-blue-300' 
                                : 'text-zinc-600 cursor-not-allowed'
                            }`}
                            title={isToday ? "Edit count" : "Historical data cannot be edited"}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveStat(0)}
                            className="text-green-400 hover:text-green-300 transition-colors p-1"
                            title="Save"
                          >
                            ✓
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Auto-calculated "The rise total employees" - Fourth row */}
                    <tr className="border-b border-zinc-700/50 bg-green-900/20">
                      <td className="py-3 px-4 font-medium text-green-400">
                        The rise total employees
                      </td>
                      <td className="text-right py-3 px-4 font-bold text-lg text-green-400">
                        {theRiseTotalEmployees}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                          Auto
                        </span>
                      </td>
                    </tr>

                    {/* Remaining Company Stats - Ram studios & Rise Technology */}
                    {companyStats.slice(1).map((stat, index) => {
                      const actualIndex = index + 1;
                      return (
                        <tr 
                          key={actualIndex} 
                          className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{stat.name}</div>
                          </td>
                          <td className="text-right py-3 px-4">
                            {editingStats[actualIndex] && isToday ? (
                              <input
                                type="number"
                                value={stat.count || 0}
                                onChange={(e) => updateCompanyStat(actualIndex, e.target.value)}
                                className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-right"
                                min="0"
                                autoFocus
                              />
                            ) : (
                              <div className="font-bold text-lg text-white">
                                {stat.count || 0}
                              </div>
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {!editingStats[actualIndex] ? (
                              <button
                                onClick={() => handleEditStat(actualIndex)}
                                disabled={!isToday}
                                className={`p-1 transition-colors ${
                                  isToday 
                                    ? 'text-blue-400 hover:text-blue-300' 
                                    : 'text-zinc-600 cursor-not-allowed'
                                }`}
                                title={isToday ? "Edit count" : "Historical data cannot be edited"}
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSaveStat(actualIndex)}
                                className="text-green-400 hover:text-green-300 transition-colors p-1"
                                title="Save"
                              >
                                ✓
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Total Company Employees Row */}
                    <tr className="border-t-2 border-blue-600 bg-zinc-800/50">
                      <td className="py-4 px-4 font-bold text-blue-400">
                        TOTAL EMPLOYEES
                      </td>
                      <td className="text-right py-4 px-4 font-bold text-2xl text-blue-400">
                        {totalCompanyEmployees}
                      </td>
                      <td className="text-center py-4 px-4">
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                          Auto
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
        duration={4000}
      />
    </div>
  );
};

export default DailyLabourAllocationDashboard;
