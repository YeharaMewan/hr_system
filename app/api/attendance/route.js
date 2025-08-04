// /api/attendance/route.js

import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import { NextResponse } from 'next/server';

export async function GET(request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year'));
    const month = parseInt(searchParams.get('month'));

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ success: false, error: 'Year and month are required.' }, { status: 400 });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const users = await User.find({}, '_id name').lean();
    
    // createdAt மற்றும் updatedAt ஐப் பெற, Attendance එකෙන් සියලුම fields ලබාගන්න
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const staffWithAttendance = users.map(user => {
      const userAttendance = {};
      attendanceRecords
        .filter(record => record.userId && record.userId.toString() === user._id.toString())
        .forEach(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          
          // --- මෙතැන වෙනස් කරන්න ---
          // status එක පමණක් වෙනුවට, අවශ්‍ය දත්ත සහිත object එකක් යොදන්න.
          userAttendance[recordDate] = {
            status: record.status,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
          };
          // --- වෙනස්කම අවසන් ---

        });
      
      return {
        _id: user._id,
        name: user.name,
        attendance: userAttendance,
      };
    });

    return NextResponse.json({ success: true, data: staffWithAttendance });
  } catch (error) {
    console.error("API Error in GET /api/attendance:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT function එකෙහි වෙනසක් අවශ්‍ය නොවේ.
export async function PUT(request) {
    // ... no changes needed here
    await dbConnect();
    try {
const { userId, date, status } = await request.json();

if (!userId || !date || status === undefined) {
 return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
 }
 
 const dateObj = new Date(date);

if (status === "") {
 await Attendance.deleteOne({ userId, date: dateObj });
 return NextResponse.json({ success: true, data: { removed: true } });
} else {
const updatedAttendance = await Attendance.findOneAndUpdate(
 { userId, date: dateObj },
 { $set: { status } },
 { new: true, upsert: true, runValidators: true }
);
return NextResponse.json({ success: true, data: updatedAttendance });
}
} catch (error) {
 console.error("API Error in PUT /api/attendance:", error.message);
 // Don't expose detailed Mongo error to client, just the message
return NextResponse.json({ success: false, error: "A database error occurred." }, { status: 500 });
 }
}