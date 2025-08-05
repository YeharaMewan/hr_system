// app/api/dashboard/stats/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Task from "@/models/Task";
import LabourAllocationRecord from "@/models/LabourAllocationRecord";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    await connectMongoDB();

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all data in parallel
    const [allUsers, leaders, todayAttendance, tasks, todayLabourAllocation] = await Promise.all([
      // Get all users for total count
      User.find({ 
        role: { $in: ['leader', 'labour'] },
        isActive: { $ne: false }
      }).select('_id name role').lean(),
      
      // Get only leaders for attendance overview
      User.find({ 
        role: 'leader',
        isActive: { $ne: false }
      }).select('_id name role').lean(),
      
      // Get today's attendance for leaders only
      Attendance.find({
        date: { $gte: today, $lte: endOfDay }
      }).populate('userId', 'role').select('userId status').lean(),
      
      // Get all tasks
      Task.find({}).select('status').lean(),
      
      // Get today's labour allocation record to get total employee count
      LabourAllocationRecord.findOne({
        date: { $gte: today, $lte: endOfDay }
      }).select('totalLabourCount leaderAllocations companyStats calculatedValues').lean()
        .catch(err => {
          console.warn("Warning: Could not fetch labour allocation record:", err.message);
          return null; // Return null if there's an error
        })
    ]);

    // Create attendance map for leaders only
    const attendanceMap = {};
    todayAttendance
      .filter(att => att.userId && att.userId.role === 'leader') // Only include leaders
      .forEach(att => {
        attendanceMap[att.userId._id.toString()] = att.status;
      });

    // Calculate user statistics (use allUsers for total counts)
    const totalUsers = allUsers.length;
    const totalLabours = allUsers.filter(user => user.role === 'labour').length;
    const totalLeaders = allUsers.filter(user => user.role === 'leader').length;

    // Calculate attendance statistics for leaders (Present + Work from home + Work from out of Rise)
    const workingLeaders = leaders.filter(leader => {
      const status = attendanceMap[leader._id.toString()];
      return status === 'Present' || status === 'Work from home' || status === 'Work from out of Rise';
    });
    
    const presentLeadersOnly = leaders.filter(leader => 
      attendanceMap[leader._id.toString()] === 'Present'
    );
    
    const workingLeadersCount = workingLeaders.length;
    const presentLeadersCount = presentLeadersOnly.length;
    
    // Get total employee count from today's labour allocation record
    let totalEmployeesToday = 0;
    let totalLabourCountToday = 0;
    let totalCompanyEmployeesToday = 0;
    let codegenAigrowCount = 0;
    let ramStudiosCount = 0;
    let riseTechnologyCount = 0;
    
    if (todayLabourAllocation) {
      // Get the total labour count from the record
      totalLabourCountToday = todayLabourAllocation.totalLabourCount || 0;
      
      // Extract individual company stats
      if (todayLabourAllocation.companyStats && todayLabourAllocation.companyStats.length > 0) {
        todayLabourAllocation.companyStats.forEach(company => {
          if (company.name.toLowerCase().includes('codegen') || company.name.toLowerCase().includes('aigrow')) {
            codegenAigrowCount = company.count || 0;
          } else if (company.name.toLowerCase().includes('ram studios')) {
            ramStudiosCount = company.count || 0;
          } else if (company.name.toLowerCase().includes('rise technology')) {
            riseTechnologyCount = company.count || 0;
          }
        });
        
        totalCompanyEmployeesToday = codegenAigrowCount + ramStudiosCount + riseTechnologyCount;
      }
      
      // Calculate final total attendance: Total Labour + Working Leaders + Company Employees
      totalEmployeesToday = totalLabourCountToday + workingLeadersCount + totalCompanyEmployeesToday;
    }
    
    // If no labour allocation record exists, fall back to working leaders count
    const finalTodayAttendance = totalEmployeesToday > 0 ? totalEmployeesToday : workingLeadersCount;

    // Calculate attendance rates (remove percentage display for main attendance)
    const leaderAttendanceRate = totalLeaders > 0 ? Math.round((presentLeadersCount / totalLeaders) * 100) : 0;
    // No overall attendance rate calculation as requested

    // Calculate task statistics
    const activeTasks = tasks.filter(task => 
      ['Pending', 'In Progress', 'pending', 'in-progress'].includes(task.status)
    ).length;
    
    const completedTasks = tasks.filter(task => 
      ['Completed', 'completed'].includes(task.status)
    ).length;

    // Get attendance status breakdown for leaders only
    const attendanceStatusBreakdown = {};
    const allStatuses = ['Present', 'Work from home', 'Planned Leave', 'Sudden Leave', 'Medical Leave', 'Holiday Leave', 'Lieu leave', 'Work from out of Rise', 'Not Marked'];
    
    allStatuses.forEach(status => {
      if (status === 'Not Marked') {
        attendanceStatusBreakdown[status] = leaders.filter(leader => 
          !attendanceMap[leader._id.toString()]
        ).length;
      } else {
        attendanceStatusBreakdown[status] = leaders.filter(leader => 
          attendanceMap[leader._id.toString()] === status
        ).length;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        // User statistics
        totalUsers,
        totalLabours,
        totalLeaders,
        
        // Attendance statistics (Total Labour + Working Leaders + Company Employees)
        todayAttendance: finalTodayAttendance,
        todayAttendanceBreakdown: {
          leaders: workingLeadersCount, // Present + WFH + Work from out of Rise
          presentLeadersOnly: presentLeadersCount, // Only Present leaders
          labours: totalLabourCountToday,
          totalEmployees: totalEmployeesToday,
          companyEmployees: totalCompanyEmployeesToday,
          codegenAigrow: codegenAigrowCount,
          ramStudios: ramStudiosCount,
          riseTechnology: riseTechnologyCount
        },
        attendanceRate: null, // No percentage as requested
        leaderAttendanceRate,
        
        // Detailed attendance breakdown
        attendanceStatusBreakdown,
        
        // Task statistics
        activeTasks,
        completedTasks,
        totalTasks: tasks.length,
        
        // Meta information
        date: today.toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error fetching dashboard stats:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}
