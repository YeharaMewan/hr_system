// app/api/labour-allocation/leaders-status/route.js
// ✅ CLEAN VERSION - No console logs

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";

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

    // Get only leaders
    const leaders = await User.find({ 
      role: 'leader'
    }).select('_id name email role skills').lean();

    // Get today's attendance - use date range approach since it works
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setDate(startOfDay.getDate() - 1);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayAttendance = await Attendance.find({
      userId: { $in: leaders.map(l => l._id) },
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    // Map attendance to leaders
    const leadersWithStatus = leaders.map(leader => {
      const attendance = todayAttendance.find(
        att => att.userId.toString() === leader._id.toString()
      );
      
      return {
        ...leader,
        attendanceStatus: attendance?.status || 'Not Marked',
        hasAttendanceRecord: !!attendance
      };
    });

    return NextResponse.json({
      leaders: leadersWithStatus,
      success: true,
      meta: {
        totalLeaders: leaders.length,
        attendanceRecords: todayAttendance.length
      }
    });

  } catch (error) {
    console.error("Error fetching leaders status:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}