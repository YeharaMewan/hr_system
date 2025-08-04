// app/components/LabourAllocationDashboard.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Building, Loader, AlertCircle, UserCheck, Settings, Save, Calendar } from 'lucide-react';

const LabourAllocationDashboard = () => {
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

  // Attendance status colors - dashboard එකෙන් ගත්ත color scheme
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

  // Fetch labour allocation data with attendance status
  const fetchLabourData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks with allocations
      const tasksResponse = await fetch('/api/tasks');
      const tasksData = await tasksResponse.json();
      
      // Fetch users with today's attendance status
      const usersResponse = await fetch('/api/users/all');
      const usersData = await usersResponse.json();
      
      if (tasksData.success && usersData.success) {
        const leaders = usersData.users.filter(user => user.role === 'leader');
        
        // Calculate labour count for each leader
        const leaderLabourCount = leaders.map(leader => {
          // Tasks API response structure අනුව leader matching කරන්න
          const leaderTasks = tasksData.tasks.filter(task => {
            // assignedLeader field එක තියේ නම් ඒකේ _id check කරන්න
            if (task.assignedLeader && task.assignedLeader._id) {
              return task.assignedLeader._id === leader._id;
            }
            // leader field එක තියේ නම් ඒකට check කරන්න
            if (task.leader && task.leader._id) {
              return task.leader._id === leader._id;
            }
            // String ID compare කරන්න
            return task.assignedLeader === leader._id || task.leader === leader._id;
          });
          
          // Allocations array එකෙන් labour count එක calculate කරන්න
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
            attendanceStatus: leader.status || 'Not Marked' // Today's attendance status
          };
        });
        
        // Sort කරන්න name අනුව
        leaderLabourCount.sort((a, b) => a.name.localeCompare(b.name));
        
        setLabourData(leaderLabourCount);
      } else {
        throw new Error(tasksData.message || usersData.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching labour data:', err);
      setError('Failed to load labour allocation data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load saved company stats from API instead of localStorage
  const loadCompanyStats = async () => {
    try {
      const response = await fetch('/api/labour-allocation/company-stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setCompanyStats(data.stats);
          if (data.record) {
            setLastSaved(new Date(data.record.updatedAt));
          }
        }
      }
    } catch (err) {
      console.error('Error loading saved company stats:', err);
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('companyStats');
        if (saved) {
          const parsedStats = JSON.parse(saved);
          setCompanyStats(parsedStats);
          
          const lastSavedTime = localStorage.getItem('companyStatsLastSaved');
          if (lastSavedTime) {
            setLastSaved(new Date(lastSavedTime));
          }
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    }
  };

  // Save company stats to API and localStorage
  const saveCompanyStats = async () => {
    setSaving(true);
    try {
      // Save to API
      const response = await fetch('/api/labour-allocation/company-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: companyStats })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLastSaved(new Date());
        }
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('companyStats', JSON.stringify(companyStats));
      localStorage.setItem('companyStatsLastSaved', new Date().toISOString());
      
    } catch (err) {
      console.error('Error saving company stats:', err);
      // Fallback to localStorage only
      localStorage.setItem('companyStats', JSON.stringify(companyStats));
      localStorage.setItem('companyStatsLastSaved', new Date().toISOString());
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  };

  // Save daily labour allocation data with enhanced database saving
  const saveDailyData = async () => {
    try {
      const dataToSave = {
        labourData: labourData,
        companyStats: companyStats,
        calculatedValues: {
          totalLabourCount,
          theRiseTotalEmployees,
          totalCompanyEmployees,
          codegenStaffCount,
          ramStudiosCount,
          riseTechnologyCount
        },
        date: new Date().toISOString(),
        timestamp: new Date().getTime()
      };

      const response = await fetch('/api/labour-allocation/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Daily data saved successfully:', data);
          // Update UI to show save status
          setLastSaved(new Date());
        } else {
          console.error('Failed to save daily data:', data.message);
        }
      } else {
        console.error('HTTP error saving daily data:', response.status);
      }
    } catch (err) {
      console.error('Error saving daily data:', err);
      // Save to localStorage as fallback
      try {
        const fallbackData = {
          labourData,
          companyStats,
          calculatedValues: {
            totalLabourCount,
            theRiseTotalEmployees,
            totalCompanyEmployees
          },
          savedAt: new Date().toISOString()
        };
        localStorage.setItem('dailyLabourAllocation', JSON.stringify(fallbackData));
        console.log('Data saved to localStorage as fallback');
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError);
      }
    }
  };

  // Calculate total labour count
  const totalLabourCount = labourData.reduce((total, leader) => total + leader.labourCount, 0);

  // Calculate "The rise total employees" automatically
  const codegenStaffCount = companyStats[0]?.count || 0;
  const theRiseTotalEmployees = totalLabourCount + codegenStaffCount;

  // Calculate total company employees (The rise total + Ram studios + Rise Technology)
  const ramStudiosCount = companyStats[1]?.count || 0;
  const riseTechnologyCount = companyStats[2]?.count || 0;
  const totalCompanyEmployees = theRiseTotalEmployees + ramStudiosCount + riseTechnologyCount;

  // Update company stats
  const updateCompanyStat = (index, newCount) => {
    const updatedStats = [...companyStats];
    updatedStats[index].count = parseInt(newCount) || 0;
    setCompanyStats(updatedStats);
  };

  // Handle editing company stats
  const handleEditStat = (index) => {
    setEditingStats(prev => ({ ...prev, [index]: true }));
  };

  const handleSaveStat = (index) => {
    setEditingStats(prev => ({ ...prev, [index]: false }));
  };

  // useEffect hooks
  useEffect(() => {
    fetchLabourData();
    loadCompanyStats();
  }, []);

  // Auto-save when company stats change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (companyStats.some(stat => stat.count > 0)) {
        saveCompanyStats();
      }
    }, 2000); // Auto-save 2 seconds after changes

    return () => clearTimeout(timeoutId);
  }, [companyStats]);

  // Auto-save daily data when labour data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (labourData.length > 0) {
        saveDailyData();
      }
    }, 3000); // Auto-save 3 seconds after labour data changes

    return () => clearTimeout(timeoutId);
  }, [labourData, companyStats]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
          <p className="text-zinc-400">Loading Labour Allocation Dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchLabourData}
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Labour Allocation Dashboard</h1>
              <p className="text-zinc-400">කම්කරු පවරාගැනීම් සහ සමාගම් සංඛ්‍යාලේඛන</p>
            </div>
            <div className="text-right">
              <button
                onClick={saveCompanyStats}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors mb-2"
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Saving...' : 'Save Data'}
              </button>
              {lastSaved && (
                <p className="text-xs text-zinc-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  Leaders & Employees
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
                          No leaders found or no tasks allocated
                        </td>
                      </tr>
                    ) : (
                      labourData.map((leader, index) => (
                        <tr 
                          key={leader.id} 
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
                  Company Statistics
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
                        EMPLOYEES
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-zinc-300 bg-blue-600">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* First row - Total Labour Count from left table */}
                    <tr className="border-b border-zinc-700/50 bg-violet-900/20">
                      <td className="py-3 px-4 font-medium text-violet-400">
                        Total Labour Count
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

                    {/* Company Stats - First row: Codegen + Aigrow staff's */}
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{companyStats[0].name}</div>
                      </td>
                      <td className="text-right py-3 px-4">
                        {editingStats[0] ? (
                          <input
                            type="number"
                            value={companyStats[0].count}
                            onChange={(e) => updateCompanyStat(0, e.target.value)}
                            onBlur={() => handleSaveStat(0)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveStat(0)}
                            className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div className="font-bold text-lg text-white">
                            {companyStats[0].count}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {!editingStats[0] ? (
                          <button
                            onClick={() => handleEditStat(0)}
                            className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                            title="Edit count"
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

                    {/* Auto-calculated "The rise total employees" - Second row */}
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
                      const actualIndex = index + 1; // +1 because we're slicing from index 1
                      return (
                        <tr 
                          key={actualIndex} 
                          className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{stat.name}</div>
                          </td>
                          <td className="text-right py-3 px-4">
                            {editingStats[actualIndex] ? (
                              <input
                                type="number"
                                value={stat.count}
                                onChange={(e) => updateCompanyStat(actualIndex, e.target.value)}
                                onBlur={() => handleSaveStat(actualIndex)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveStat(actualIndex)}
                                className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-blue-500"
                                autoFocus
                              />
                            ) : (
                              <div className="font-bold text-lg text-white">
                                {stat.count}
                              </div>
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {!editingStats[actualIndex] ? (
                              <button
                                onClick={() => handleEditStat(actualIndex)}
                                className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                title="Edit count"
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

              {/* Attendance Legend */}
              <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Attendance Legend
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {Object.entries(statusColors).slice(0, 8).map(([status, colorClass]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full border ${colorClass}`}></div>
                      <span className="text-zinc-300 text-sm">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabourAllocationDashboard;