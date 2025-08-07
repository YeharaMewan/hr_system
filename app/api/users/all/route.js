// app/api/users/all/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import Labour from "@/models/Labour";
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

    // Get all users (leaders and employees) and labours separately
    const [users, labours] = await Promise.all([
      User.find({}).select('_id name email role skills department').lean(),
      Labour.find({}).select('_id name email role skills department').lean()
    ]);

    // Combine users and labours
    const allUsers = [...users, ...labours];

    // Get today's attendance for all users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await Attendance.find({
      userId: { $in: allUsers.map(u => u._id) },
      date: today
    }).lean();

    // Map attendance to users with proper field mapping
    const usersWithStatus = allUsers.map(user => {
      const attendance = todayAttendance.find(
        att => att.userId.toString() === user._id.toString()
      );
      
      const finalStatus = attendance?.status || 'Not Marked';
      
      return {
        ...user,
        status: finalStatus,
        department: user.department || 'No Department',
        skills: user.skills || (user.role === 'labour' ? ['General'] : user.role === 'leader' ? ['Management'] : user.role === 'hr' ? ['HR Management'] : ['General'])
      };
    });

    return NextResponse.json({
      data: usersWithStatus,  // Changed to 'data' for consistency
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}