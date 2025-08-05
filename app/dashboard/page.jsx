'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  PieChart
} from 'lucide-react';

function DashboardPage() {
  const { data: session } = useSession();
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
    pendingAllocations: 0,
    companyStats: [],
    attendanceRate: 0,
    attendanceStatusBreakdown: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch dashboard stats and company stats in parallel
      const [dashboardRes, companyStatsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/labour-allocation/company-stats')
      ]);

      // Check response status
      const dashboardStats = dashboardRes.ok ? await dashboardRes.json() : { data: {} };
      const companyStats = companyStatsRes.ok ? await companyStatsRes.json() : { stats: [] };

      // Use data from the new dashboard stats endpoint
      const stats = dashboardStats.data || {};
      
      setDashboardData({
        totalUsers: stats.totalUsers || 0,
        totalLabours: stats.totalLabours || 0,
        totalLeaders: stats.totalLeaders || 0,
        todayAttendance: stats.todayAttendance || 0,
        todayAttendanceBreakdown: stats.todayAttendanceBreakdown || { leaders: 0, labours: 0 },
        activeTasks: stats.activeTasks || 0,
        completedTasks: stats.completedTasks || 0,
        pendingAllocations: stats.activeTasks || 0,
        companyStats: companyStats.stats || [],
        attendanceRate: stats.attendanceRate || 0,
        attendanceStatusBreakdown: stats.attendanceStatusBreakdown || {}
      });

    } catch (error) {
      // Only log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching dashboard data:', error);
      }
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
          <p className={`text-2xl font-bold mt-1 ${color}`}>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-pulse bg-zinc-600 h-8 w-16 rounded"></div>
              </div>
            ) : (
              <span className="flex items-baseline gap-2">
                {value}
                {rate !== undefined && (
                  <span className="text-sm font-normal text-zinc-400">
                    ({rate}%)
                  </span>
                )}
              </span>
            )}
          </p>
          {description && (
            <p className="text-zinc-500 text-xs mt-1">{description}</p>
          )}
          {breakdown && !loading && (
            <div className="text-xs text-zinc-400 mt-2 space-y-1">
              <div className="flex justify-between">
                <span>Leaders Present:</span>
                <span className="text-yellow-500 font-semibold">{breakdown.leaders}</span>
              </div>
              {breakdown.labours > 0 && (
                <div className="flex justify-between">
                  <span>Labours Present:</span>
                  <span className="text-green-500 font-semibold">{breakdown.labours}</span>
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

  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-zinc-400 mt-1">
            Welcome back, {session?.user?.name || 'User'}! 
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
          title="Today's Attendance"
          value={dashboardData.todayAttendance}
          icon={Calendar}
          color="text-purple-500"
          description="Leaders present today"
          breakdown={dashboardData.todayAttendanceBreakdown}
          rate={dashboardData.attendanceRate}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Active Tasks"
          value={dashboardData.activeTasks}
          icon={Activity}
          color="text-orange-500"
          description="Tasks in progress"
        />
        <StatCard
          title="Completed Tasks"
          value={dashboardData.completedTasks}
          icon={Target}
          color="text-green-600"
          description="Tasks finished"
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

        {/* Company Statistics */}
        {dashboardData.companyStats.length > 0 && (
          <CompanyStatsCard stats={dashboardData.companyStats} />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;