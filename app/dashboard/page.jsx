'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { dataChangeDetector } from '@/utils/dataChangeDetector';
import { 
  Users, 
  UserCheck, 
  ClipboardList, 
  TrendingUp, 
  Calendar,
  Activity,
  Target,
  Award,
  AlertCircle,
  RefreshCw,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';

// Force dynamic rendering to avoid hydration issues
export const dynamic = 'force-dynamic';

function DashboardPage() {
  const { data: session, status } = useSession();
  
  // --- සියලුම useState ඉහළින්, return කිරීමට පෙර ---
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalLabours: 0,
    totalLeaders: 0,
    todayAttendance: 0,
    todayAttendanceBreakdown: {
      leaders: 0,
      labours: 0
    },
    activeTasks: 0,
    completedTasks: 0,
    todayActiveTasks: 0,
    todayCompletedTasks: 0,
    todayAllocatedTasks: 0,
    pendingAllocations: 0,
    companyStats: [],
    attendanceRate: 0,
    attendanceStatusBreakdown: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Auto-save hook with save function
  const autoSaveFunction = async (data) => {
    // Check authentication before saving
    if (status !== 'authenticated' || !session) {
      throw new Error('Not authenticated');
    }
    const response = await fetch('/api/dashboard/auto-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dashboardData: data })
    });
    if (!response.ok) {
      throw new Error('Auto-save failed');
    }
    return await response.json();
  };
  
  const {
    hasChanges,
    isSaving,
    lastSaved,
    initializeData,
    trackChanges,
    triggerAutoSave,
    manualSave
  } = useAutoSave(autoSaveFunction, 3000); // 3 second delay
  
  // --- සියලුම useEffect ඉහළින්, return කිරීමට පෙර ---
  
  // 1. Initialization and Auto-refresh
  useEffect(() => {
    // Only initialize once when session is authenticated and not already initialized
    if (status === 'authenticated' && session && !isInitialized) {
      setIsInitialized(true);
      fetchDashboardData();
      // Setup change detection listener
      const removeListener = dataChangeDetector.addListener((changes, newData) => {
        triggerAutoSave(newData);
      });
      // Setup periodic refresh (longer interval since we have event-driven saves)
      const interval = setInterval(() => {
        if (status === 'authenticated') { // Only refresh if still authenticated
          fetchDashboardData();
        }
      }, 600000); // 10 minutes
      setAutoRefreshInterval(interval);
      // Cleanup function for this effect
      return () => {
        if (interval) {
          clearInterval(interval);
        }
        removeListener();
      };
    }
    // Handle unauthenticated state
    if (status === 'unauthenticated') {
      setIsInitialized(false);
      setDashboardData({
        totalUsers: 0,
        totalLabours: 0,
        totalLeaders: 0,
        todayAttendance: 0,
        todayAttendanceBreakdown: { leaders: 0, labours: 0 },
        activeTasks: 0,
        completedTasks: 0,
        todayActiveTasks: 0,
        todayCompletedTasks: 0,
        todayAllocatedTasks: 0,
        pendingAllocations: 0,
        companyStats: [],
        attendanceRate: 0,
        attendanceStatusBreakdown: {}
      });
      // Clear any existing intervals
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }
    }
  }, [status, session, isInitialized, triggerAutoSave, autoRefreshInterval]);
  
  // 2. Track changes when dashboard data updates
  useEffect(() => {
    if (dashboardData.totalUsers > 0 && status === 'authenticated') { // Only track when authenticated
      const hasDataChanged = dataChangeDetector.checkForChanges(dashboardData);
    }
  }, [dashboardData, status]);
  
  // 3. Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);
  
  // --- දැන් පමණක් return කරන්න ---
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-zinc-400">Please log in to access the dashboard</p>
        </div>
      </div>
    );
  }
  
  // --- fetchDashboardData සහ අනෙකුත් ක්‍රියාවලි ---
  const fetchDashboardData = async () => {
    // Don't fetch if not authenticated
    if (status !== 'authenticated' || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch dashboard stats and company stats in parallel
      const [dashboardRes, companyStatsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/labour-allocation/company-stats')
      ]);
      // Check response status and log errors
      let dashboardStats = { data: {} };
      let companyStats = { stats: [] };
      if (dashboardRes.ok) {
        dashboardStats = await dashboardRes.json();
      } else {
        const errorText = await dashboardRes.text();
        console.error('Dashboard stats fetch error:', errorText);
      }
      if (companyStatsRes.ok) {
        companyStats = await companyStatsRes.json();
      } else {
        const errorText = await companyStatsRes.text();
        console.error('Company stats fetch error:', errorText);
      }
      // Use data from the new dashboard stats endpoint
      const stats = dashboardStats.data || {};
      const newData = {
        totalUsers: stats.totalUsers || 0,
        totalLabours: stats.totalLabours || 0,
        totalLeaders: stats.totalLeaders || 0,
        todayAttendance: stats.todayAttendance || 0,
        todayAttendanceBreakdown: stats.todayAttendanceBreakdown || { leaders: 0, labours: 0 },
        activeTasks: stats.activeTasks || 0,
        completedTasks: stats.completedTasks || 0,
        todayActiveTasks: stats.todayActiveTasks || 0,
        todayCompletedTasks: stats.todayCompletedTasks || 0,
        todayAllocatedTasks: stats.todayAllocatedTasks || 0,
        pendingAllocations: stats.activeTasks || 0,
        companyStats: companyStats.stats || [],
        attendanceRate: stats.attendanceRate || 0,
        attendanceStatusBreakdown: stats.attendanceStatusBreakdown || {}
      };
      setDashboardData(newData);
      // Initialize auto-save tracking with the fetched data
      initializeData(newData);
    } catch (error) {
      setError('Failed to load dashboard data. Please try refreshing.');
      // Show user-friendly error state
      setDashboardData({
        totalUsers: 0,
        totalLabours: 0,
        totalLeaders: 0,
        todayAttendance: 0,
        todayAttendanceBreakdown: {
          leaders: 0,
          labours: 0
        },
        activeTasks: 0,
        completedTasks: 0,
        todayAllocatedTasks: 0,
        pendingAllocations: 0,
        companyStats: [],
        attendanceRate: 0,
        attendanceStatusBreakdown: {}
      });
    } finally {
      setLoading(false);
    }
  };
  
  const StatCard = ({ title, value, icon: Icon, color, description, trend, breakdown, rate }) => (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-zinc-600 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-sm font-medium">{title}</p>
          <div className={`text-2xl font-bold mt-1 ${color}`}>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-pulse bg-zinc-600 h-8 w-16 rounded"></div>
              </div>
            ) : (
              <span className="flex items-baseline gap-2">
                {value !== undefined && value !== null ? value : '0'}
                {/* Remove percentage display for main attendance as requested */}
                {rate !== undefined && title !== "Today's Total Attendance" && (
                  <span className="text-sm font-normal text-zinc-400">
                    ({rate}%)
                  </span>
                )}
              </span>
            )}
          </div>
          {description && (
            <p className="text-zinc-500 text-xs mt-1">{description}</p>
          )}
          {breakdown && !loading && (
            <div className="text-xs text-zinc-400 mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Working Leaders:</span>
                <span className="text-yellow-500 font-semibold">{breakdown.leaders || 0}</span>
              </div>
              {(breakdown.labours || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Working Labours:</span>
                  <span className="text-green-500 font-semibold">{breakdown.labours || 0}</span>
                </div>
              )}
              {(breakdown.codegenAigrow || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Codegen + Aigrow:</span>
                  <span className="text-purple-500 font-semibold">{breakdown.codegenAigrow || 0}</span>
                </div>
              )}
              {(breakdown.ramStudios || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Ram Studios:</span>
                  <span className="text-orange-500 font-semibold">{breakdown.ramStudios || 0}</span>
                </div>
              )}
              {(breakdown.riseTechnology || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Rise Technology:</span>
                  <span className="text-cyan-500 font-semibold">{breakdown.riseTechnology || 0}</span>
                </div>
              )}
              {(breakdown.totalEmployees || 0) > 0 && (
                <div className="flex justify-between border-t border-zinc-600 pt-1 mt-1">
                  <span className="font-medium">Total Today:</span>
                  <span className="text-purple-400 font-bold">{breakdown.totalEmployees || 0}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('500', '500/20').replace('600', '600/20')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs">
          <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
          <span className="text-green-500">{trend}</span>
        </div>
      )}
    </div>
  );
  
  const CompanyStatsCard = ({ stats }) => {
    const maxCount = Math.max(...stats.map(s => s.count || 0), 1); // Prevent division by zero
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
        <div className="space-y-4">
          {stats.map((stat, index) => {
            const percentage = (stat.count / maxCount) * 100;
            let statusColor = 'bg-blue-500';
            let bgColor = 'bg-zinc-700';
            if (stat.companyName === 'Codegen') {
              statusColor = 'bg-purple-500';
            } else if (stat.companyName === 'Aigrow') {
              statusColor = 'bg-green-500';
            } else if (stat.companyName === 'Ram Studios') {
              statusColor = 'bg-orange-500';
            } else if (stat.companyName === 'Rise Technology') {
              statusColor = 'bg-cyan-500';
            }
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{stat.companyName}</span>
                  <span className="text-zinc-400">{stat.count} labours</span>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${statusColor}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6" suppressHydrationWarning={true}>
      {/* Header */}
      <div className="flex items-center justify-between" suppressHydrationWarning={true}>
        <div suppressHydrationWarning={true}>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-zinc-400">
              Welcome back, {session?.user?.name || 'User'}!
            </p>
            {/* Auto-save status indicator */}
            <div className="flex items-center gap-2 text-xs">
              {isSaving && (
                <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  Saving...
                </span>
              )}
              {hasChanges && !isSaving && (
                <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  <Clock className="w-3 h-3" />
                  Unsaved changes
                </span>
              )}
              {!hasChanges && !isSaving && lastSaved && (
                <span className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            disabled={loading || status !== 'authenticated'}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-100 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={dashboardData.totalUsers}
          icon={Users}
          color="text-blue-500"
          description="All registered users"
        />
        <StatCard
          title="Total Labours"
          value={dashboardData.totalLabours}
          icon={UserCheck}
          color="text-green-500"
          description="Active labour force"
        />
        <StatCard
          title="Team Leaders"
          value={dashboardData.totalLeaders}
          icon={Award}
          color="text-yellow-500"
          description="Leadership positions"
          rate={dashboardData.leaderAttendanceRate}
        />
        <StatCard
          title="Today's Total Attendance"
          value={dashboardData.todayAttendance}
          icon={Calendar}
          color="text-purple-500"
          description="All employees present today"
          breakdown={dashboardData.todayAttendanceBreakdown}
          rate={null} // No percentage display
        />
      </div>
      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Today's Active Tasks"
          value={dashboardData.todayActiveTasks}
          icon={Activity}
          color="text-orange-500"
          description={`${dashboardData.todayActiveTasks} of ${dashboardData.todayAllocatedTasks} allocated tasks active`}
        />
        <StatCard
          title="Today's Completed Tasks"
          value={dashboardData.todayCompletedTasks}
          icon={Target}
          color="text-green-600"
          description={`${dashboardData.todayCompletedTasks} of ${dashboardData.todayAllocatedTasks} allocated tasks completed`}
        />
        <StatCard
          title="Today's Allocated Tasks"
          value={dashboardData.todayAllocatedTasks}
          icon={ClipboardList}
          color="text-purple-600"
          description="Total tasks allocated for today"
        />
      </div>
      {/* Quick Actions */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Quick Actions</h3>
          <Activity className="w-5 h-5 text-zinc-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a 
            href="/dashboard/attendance/quickattendance"
            className="flex items-center justify-between p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-green-500" />
              <span className="text-white">Mark Attendance</span>
            </div>
            <span className="text-zinc-400 group-hover:text-white">→</span>
          </a>
          <a 
            href="/dashboard/daily-task-allocation"
            className="flex items-center justify-between p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              <span className="text-white">Task Allocation</span>
            </div>
            <span className="text-zinc-400 group-hover:text-white">→</span>
          </a>
          <a 
            href="/dashboard/daily-labour-allocation"
            className="flex items-center justify-between p-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="text-white">Labour Allocation</span>
            </div>
            <span className="text-zinc-400 group-hover:text-white">→</span>
          </a>
        </div>
      </div>
      {/* Company Stats and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Status Overview */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Today's Leaders Attendance Overview</h3>
            <UserCheck className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="space-y-3">
            {Object.entries(dashboardData.attendanceStatusBreakdown || {}).map(([status, count]) => {
              if (count === 0) return null;
              let statusColor = 'text-zinc-400';
              let bgColor = 'bg-zinc-700';
              switch (status) {
                case 'Present':
                  statusColor = 'text-green-500';
                  bgColor = 'bg-green-500/20';
                  break;
                case 'Work from home':
                case 'Work from out of Rise':
                  statusColor = 'text-blue-500';
                  bgColor = 'bg-blue-500/20';
                  break;
                case 'Not Marked':
                  statusColor = 'text-yellow-500';
                  bgColor = 'bg-yellow-500/20';
                  break;
                default:
                  statusColor = 'text-red-500';
                  bgColor = 'bg-red-500/20';
              }
              return (
                <div key={status} className={`flex items-center justify-between p-3 ${bgColor} rounded-lg`}>
                  <span className="text-white text-sm">{status}</span>
                  <span className={`${statusColor} font-semibold`}>{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 text-center">
              * Showing team leaders attendance only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;