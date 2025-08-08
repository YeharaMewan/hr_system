// app/api/dashboard/stats/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import Labour from "@/models/Labour";
import Attendance from "@/models/Attendance";
import Task from "@/models/Task";
import LabourAllocationRecord from "@/models/LabourAllocationRecord";
import TaskAllocationRecord from "@/models/TaskAllocationRecord";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized access - authentication required" },
        { status: 401 }
      );
    }

    await connectMongoDB();

    // Get today's date with better handling
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all data in parallel with better error handling
    const [allUsers, allLabours, leaders, todayAttendance, tasks, todayLabourAllocation, todayTaskAllocations] = await Promise.all([
      // Get all users (leaders and employees only)
      User.find({ 
        isActive: { $ne: false }
      }).select('_id name role').lean()
        .catch(err => {
          return [];
        }),
      
      // Get all labours
      Labour.find({ 
        isActive: { $ne: false }
      }).select('_id name role').lean()
        .catch(err => {
          return [];
        }),
      
      // Get only leaders for attendance overview
      User.find({ 
        role: 'leader',
        isActive: { $ne: false }
      }).select('_id name role').lean()
        .catch(err => {
          return [];
        }),
      
      // Get today's attendance - ALL attendance records for today (Users + Labours)
      Attendance.find({
        date: { $gte: today, $lte: endOfDay }
      }).populate([
        { path: 'userId', select: 'name role', model: 'User' }
      ]).select('userId status date createdAt').lean()
        .catch(err => {
          return [];
        }),
      
      // Get all tasks
      Task.find({}).select('status').lean()
        .catch(err => {
          return [];
        }),
      
      // Get today's labour allocation record
      LabourAllocationRecord.findOne({
        date: { $gte: today, $lte: endOfDay }
      }).select('totalLabourCount leaderAllocations companyStats calculatedValues').lean()
        .catch(err => {
          return null;
        }),

      // Get today's task allocations
      TaskAllocationRecord.findOne({
        date: { $gte: today, $lte: endOfDay }
      }).select('taskAllocations summary').lean()
        .catch(err => {
          return null;
        })
    ]);

    // Additionally get labour attendance separately (since Labour uses different collection)
    const todayLabourAttendance = await Attendance.find({
      date: { $gte: today, $lte: endOfDay },
      userId: { $in: allLabours.map(l => l._id) } // Only labour IDs
    }).populate([
      { path: 'userId', select: 'name role', model: 'Labour' }
    ]).select('userId status date createdAt').lean()
      .catch(err => {
        return [];
      });

    // Combine both attendance arrays
    const allTodayAttendance = [...todayAttendance, ...todayLabourAttendance];

    // Create attendance maps
    const leaderAttendanceMap = {};
    const allAttendanceMap = {};
    const labourAttendanceMap = {};
    
    // Process all attendance records
    allTodayAttendance.forEach(att => {
      if (att.userId) {
        const userId = att.userId._id.toString();
        allAttendanceMap[userId] = att.status;
        
        // Separate maps for leaders and labours
        if (att.userId.role === 'leader') {
          leaderAttendanceMap[userId] = att.status;
        } else if (att.userId.role === 'labour') {
          labourAttendanceMap[userId] = att.status;
        }
      }
    });

    // Calculate user statistics
    const totalUsers = allUsers.length + allLabours.length;
    const totalLabours = allLabours.length;
    const totalLeaders = leaders.length;
    const totalEmployees = allUsers.filter(user => user.role === 'employee').length;

    // Calculate attendance statistics - Include labour attendance
    // Count all attendance records with "working" status
    const workingStatuses = ['Present', 'Work from home', 'Work from out of Rise'];
    
    // Count working leaders
    const workingLeaders = leaders.filter(leader => {
      const status = leaderAttendanceMap[leader._id.toString()];
      return workingStatuses.includes(status);
    });
    
    // Count present leaders only
    const presentLeadersOnly = leaders.filter(leader => 
      leaderAttendanceMap[leader._id.toString()] === 'Present'
    );
    
    // Count working labours - Use LabourAllocationRecord data if available, otherwise use attendance records
    let workingLaboursCount = 0;
    let presentLaboursOnlyCount = 0;
    
    if (todayLabourAllocation && todayLabourAllocation.totalLabourCount) {
      // Use saved labour count from LabourAllocationRecord
      workingLaboursCount = todayLabourAllocation.totalLabourCount || 0;
      presentLaboursOnlyCount = todayLabourAllocation.calculatedValues?.actualPresentLabourCount || 0;
      
    } else {
      // Fallback to attendance records if no LabourAllocationRecord
      const workingLabours = allLabours.filter(labour => {
        const status = labourAttendanceMap[labour._id.toString()];
        return workingStatuses.includes(status);
      });
      
      const presentLaboursOnly = allLabours.filter(labour => 
        labourAttendanceMap[labour._id.toString()] === 'Present'
      );
      
      workingLaboursCount = workingLabours.length;
      presentLaboursOnlyCount = presentLaboursOnly.length;
      
    }

    // Get labour allocation data for company stats AND total labour count
    let companyEmployeesCount = 0;
    let allocatedLabourCount = 0; // Labour count from labour allocation
    let codegenAigrowCount = 0;
    let ramStudiosCount = 0;
    let riseTechnologyCount = 0;
    
    if (todayLabourAllocation) {
      // Get allocated labour count from labour allocation record
      allocatedLabourCount = todayLabourAllocation.totalLabourCount || 0;
      
      // Get company stats
      if (todayLabourAllocation.companyStats) {
        todayLabourAllocation.companyStats.forEach(company => {
          if (company.name.toLowerCase().includes('codegen') || 
              company.name.toLowerCase().includes('aigrow')) {
            codegenAigrowCount = company.count || 0;
          } else if (company.name.toLowerCase().includes('ram studios')) {
            ramStudiosCount = company.count || 0;
          } else if (company.name.toLowerCase().includes('rise technology')) {
            riseTechnologyCount = company.count || 0;
          }
        });
        companyEmployeesCount = codegenAigrowCount + ramStudiosCount + riseTechnologyCount;
      }
      
      // If totalLabourCount is 0, try to get it from leaderAllocations
      if (allocatedLabourCount === 0 && todayLabourAllocation.leaderAllocations) {
        const calculatedLabourCount = todayLabourAllocation.leaderAllocations.reduce((total, leader) => 
          total + (leader.labourCount || 0), 0
        );
        allocatedLabourCount = calculatedLabourCount;
        
      }
      
    }
    
    // Calculate final total attendance - Include allocated labour count from labour allocation
    const workingLeadersCount = workingLeaders.length;
    const totalTodayAttendance = workingLeadersCount + workingLaboursCount + allocatedLabourCount + companyEmployeesCount;

    // Calculate attendance rates
    const presentLeadersCount = presentLeadersOnly.length;
    const leaderAttendanceRate = totalLeaders > 0 ? Math.round((presentLeadersCount / totalLeaders) * 100) : 0;

    // Calculate task statistics
    const activeTasks = tasks.filter(task => 
      ['Pending', 'In Progress', 'pending', 'in-progress'].includes(task.status)
    ).length;
    
    const completedTasks = tasks.filter(task => 
      ['Completed', 'completed'].includes(task.status)
    ).length;

    // Calculate today's allocated tasks
    const todayAllocatedTasks = todayTaskAllocations?.taskAllocations?.length || 0;
    
    // Calculate today's active and completed tasks from task allocations
    const todayActiveTasks = todayTaskAllocations?.taskAllocations?.filter(task => 
      ['Pending', 'In Progress', 'pending', 'in-progress'].includes(task.status)
    ).length || 0;
    
    const todayCompletedTasks = todayTaskAllocations?.taskAllocations?.filter(task => 
      ['Completed', 'completed'].includes(task.status)
    ).length || 0;

    // Get attendance status breakdown for leaders only
    const attendanceStatusBreakdown = {};
    const allStatuses = ['Present', 'Work from home', 'Planned Leave', 'Sudden Leave', 'Medical Leave', 'Holiday Leave', 'Lieu leave', 'Work from out of Rise', 'Not Marked'];
    
    allStatuses.forEach(status => {
      if (status === 'Not Marked') {
        attendanceStatusBreakdown[status] = leaders.filter(leader => 
          !leaderAttendanceMap[leader._id.toString()]
        ).length;
      } else {
        attendanceStatusBreakdown[status] = leaders.filter(leader => 
          leaderAttendanceMap[leader._id.toString()] === status
        ).length;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        // User statistics
        totalUsers,
        totalLabours,
        totalEmployees,
        totalLeaders,
        
        // Attendance statistics - Now includes allocated labour count from labour allocation
        todayAttendance: totalTodayAttendance,
        todayAttendanceBreakdown: {
          leaders: workingLeadersCount,
          presentLeadersOnly: presentLeadersOnly.length,
          labours: workingLaboursCount,
          allocatedLabours: allocatedLabourCount,
          presentLaboursOnly: presentLaboursOnlyCount,
          totalEmployees: totalTodayAttendance,
          companyEmployees: companyEmployeesCount,
          codegenAigrow: codegenAigrowCount,
          ramStudios: ramStudiosCount,
          riseTechnology: riseTechnologyCount
        },
        attendanceRate: null,
        leaderAttendanceRate,
        
        // Detailed attendance breakdown
        attendanceStatusBreakdown,
        
        // Task statistics
        activeTasks,
        completedTasks,
        totalTasks: tasks.length,
        todayAllocatedTasks,
        todayActiveTasks,
        todayCompletedTasks,
        
        // Meta information
        date: today.toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        
        // Debug info
        debug: {
          attendanceRecordsFound: allTodayAttendance.length,
          userAttendanceRecords: todayAttendance.length,
          labourAttendanceRecords: todayLabourAttendance.length,
          totalLaboursInDB: totalLabours,
          workingLaboursToday: workingLaboursCount,
          allocatedLaboursToday: allocatedLabourCount,
          labourDataSource: todayLabourAllocation ? 'LabourAllocationRecord' : 'AttendanceRecords',
          labourAllocationRecord: todayLabourAllocation ? {
            totalLabourCount: todayLabourAllocation.totalLabourCount,
            actualPresentLabourCount: todayLabourAllocation.calculatedValues?.actualPresentLabourCount,
            hasCompanyStats: !!todayLabourAllocation.companyStats
          } : null,
          attendanceCalculation: {
            leaders: workingLeadersCount,
            attendanceLabours: workingLaboursCount,
            allocatedLabours: allocatedLabourCount,
            companyEmployees: companyEmployeesCount,
            total: totalTodayAttendance
          },
          dateRange: {
            start: today.toISOString(),
            end: endOfDay.toISOString()
          }
        }
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        message: "Server error occurred",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
