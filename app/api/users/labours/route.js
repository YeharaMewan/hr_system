// app/api/users/labours/route.js
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    await connectMongoDB();

    // Get target date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all labour users
    const labours = await User.find({ 
      role: 'labour',
      isActive: { $ne: false }
    }).select('_id name email role').lean();

    // Get attendance for labours for the specific date
    const attendanceRecords = await Attendance.find({
      userId: { $in: labours.map(l => l._id) },
      date: { $gte: targetDate, $lte: endOfDay }
    }).lean();

    // Create attendance map
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.userId.toString()] = record.status;
    });

    // Map attendance to labours
    const laboursWithAttendance = labours.map(labour => {
      const attendanceStatus = attendanceMap[labour._id.toString()] || 'Not Marked';
      const isPresent = attendanceStatus === 'Present' || 
                       attendanceStatus === 'Work from home' || 
                       attendanceStatus === 'Work from out of Rise';
      
      return {
        ...labour,
        attendanceStatus,
        isPresent
      };
    });

    // Calculate present labour count
    const presentLabourCount = laboursWithAttendance.filter(labour => labour.isPresent).length;
    const totalLabourCount = laboursWithAttendance.length;

    return NextResponse.json({
      labours: laboursWithAttendance,
      presentLabourCount,
      totalLabourCount,
      date: targetDate.toISOString().split('T')[0],
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}