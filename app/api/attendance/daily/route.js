// app/api/attendance/daily/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

// Get attendance data for a specific date
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // Parse the date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // Get all leaders
    const leaders = await User.find({ role: 'leader' }, '_id name email').lean();
    
    // Get attendance records for the specific date
    const attendanceRecords = await Attendance.find({
      date: { $gte: targetDate, $lte: endDate },
      userId: { $in: leaders.map(u => u._id) }
    }).lean();

    // Create a map of attendance records by userId
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.userId.toString()] = record.status;
    });

    // Combine leaders with their attendance status
    const leadersWithAttendance = leaders.map(leader => ({
      _id: leader._id,
      name: leader.name,
      email: leader.email,
      attendanceStatus: attendanceMap[leader._id.toString()] || 'Not Marked'
    }));

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      leaders: leadersWithAttendance
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}

// Save attendance data for multiple leaders on a specific date
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { attendanceData, date } = await request.json();

    if (!attendanceData || !Array.isArray(attendanceData)) {
      return NextResponse.json(
        { message: "Invalid attendance data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Process each attendance record
    const results = await Promise.all(
      attendanceData.map(async (record) => {
        const { userId, status } = record;
        
        if (status === 'Not Marked' || !status) {
          // Remove attendance record if status is "Not Marked"
          await Attendance.deleteOne({ userId, date: targetDate });
          return { userId, action: 'removed' };
        } else {
          // Update or create attendance record
          const updatedRecord = await Attendance.findOneAndUpdate(
            { userId, date: targetDate },
            { $set: { status } },
            { new: true, upsert: true, runValidators: true }
          );
          return { userId, action: 'updated', record: updatedRecord };
        }
      })
    );

    return NextResponse.json({
      message: "Attendance data saved successfully",
      results: results,
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}
