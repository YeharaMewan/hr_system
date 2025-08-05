// app/api/dashboard/stats/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Task from "@/models/Task";

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
    const [allUsers, leaders, todayAttendance, tasks] = await Promise.all([
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
      Task.find({}).select('status').lean()
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

    // Calculate attendance statistics for leaders only
    const presentLeaders = leaders.filter(leader => 
      attendanceMap[leader._id.toString()] === 'Present'
    );
    
    const todayAttendanceCount = presentLeaders.length;
    const presentLabours = 0; // Not showing labour attendance in overview

    // Calculate attendance rates for leaders only
    const attendanceRate = totalLeaders > 0 ? Math.round((todayAttendanceCount / totalLeaders) * 100) : 0;
    const leaderAttendanceRate = attendanceRate;
    const labourAttendanceRate = 0; // Not calculating labour attendance

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
        
        // Attendance statistics (leaders only)
        todayAttendance: todayAttendanceCount,
        todayAttendanceBreakdown: {
          leaders: todayAttendanceCount, // Same as todayAttendance since we're only showing leaders
          labours: presentLabours // Will be 0
        },
        attendanceRate,
        leaderAttendanceRate,
        labourAttendanceRate,
        
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
