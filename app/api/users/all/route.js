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
    
    const todayAttendance = await Attendance.find({
      employee: { $in: users.map(u => u._id) },
      date: today
    }).lean();

    // Map attendance to users
    const usersWithStatus = users.map(user => {
      const attendance = todayAttendance.find(
        att => att.employee.toString() === user._id.toString()
      );
      
      return {
        ...user,
        status: attendance?.status || (user.role === 'labour' ? 'Present' : 'Not Marked'),
        skills: user.skills || (user.role === 'labour' ? ['General'] : ['Management'])
      };
    });

    return NextResponse.json({
      users: usersWithStatus,
      success: true
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}
