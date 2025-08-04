// app/api/users/all/route.js

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

    // Get all users (leaders and labours)
    const users = await User.find({ 
      role: { $in: ['leader', 'labour'] }
    }).select('_id name email role skills').lean();

    // Get today's attendance for all users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // ✅ MAIN FIX: Use correct field name 'userId' from Attendance model
    const todayAttendance = await Attendance.find({
      userId: { $in: users.map(u => u._id) }, // Fixed: 'employee' -> 'userId'
      date: today
    }).lean();

    console.log('📅 Attendance Query Debug:', {
      todayDate: today,
      totalUsers: users.length,
      attendanceRecordsFound: todayAttendance.length,
      attendanceUserIds: todayAttendance.map(a => a.userId.toString())
    });

    // Map attendance to users with proper field mapping
    const usersWithStatus = users.map(user => {
      const attendance = todayAttendance.find(
        att => att.userId.toString() === user._id.toString() // Fixed: 'employee' -> 'userId'
      );
      
      const finalStatus = attendance?.status || 'Not Marked';
      
      console.log(`👤 ${user.name} (${user.role}):`, {
        userId: user._id.toString(),
        hasAttendance: !!attendance,
        attendanceStatus: attendance?.status,
        finalStatus: finalStatus
      });
      
      return {
        ...user,
        status: finalStatus,
        skills: user.skills || (user.role === 'labour' ? ['General'] : ['Management'])
      };
    });

    return NextResponse.json({
      users: usersWithStatus,
      success: true,
      debug: {
        totalUsers: users.length,
        attendanceRecords: todayAttendance.length,
        date: today
      }
    });

  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}