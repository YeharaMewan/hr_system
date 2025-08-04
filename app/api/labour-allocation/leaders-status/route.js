// app/api/labour-allocation/leaders-status/route.js
// ✅ FIXED: Date/Timezone issue

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

    // Get only leaders for Labour Allocation dashboard
    const leaders = await User.find({ 
      role: 'leader'
    }).select('_id name email role skills').lean();

    console.log('👥 Leaders found:', leaders.length);

    // ✅ MAIN FIX: Proper date handling for Sri Lankan timezone
    const today = new Date();
    
    // Option 1: Use local Sri Lankan date
    const sriLankanDate = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Colombo"}));
    sriLankanDate.setHours(0, 0, 0, 0);
    
    // Option 2: Alternative - Use server date but ensure it's today
    const serverToday = new Date();
    serverToday.setHours(0, 0, 0, 0);
    
    // Use both dates for comparison
    console.log('📅 Date Debug:', {
      originalToday: today.toISOString(),
      sriLankanToday: sriLankanDate.toISOString(),
      serverToday: serverToday.toISOString(),
      currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    // Try both date approaches
    const queries = [
      { date: serverToday, name: 'serverToday' },
      { date: sriLankanDate, name: 'sriLankanDate' }
    ];
    
    let todayAttendance = [];
    let usedDate = null;
    
    for (const query of queries) {
      console.log(`🔍 Trying query with ${query.name}:`, query.date.toISOString());
      
      const attendanceRecords = await Attendance.find({
        userId: { $in: leaders.map(l => l._id) },
        date: query.date
      }).lean();
      
      console.log(`📊 ${query.name} results:`, {
        recordsFound: attendanceRecords.length,
        userIds: attendanceRecords.map(r => r.userId.toString())
      });
      
      if (attendanceRecords.length > 0) {
        todayAttendance = attendanceRecords;
        usedDate = query.date;
        console.log(`✅ Using ${query.name} - found ${attendanceRecords.length} records`);
        break;
      }
    }
    
    // If no records found with either approach, try broader date range
    if (todayAttendance.length === 0) {
      console.log('🔍 No records found with exact dates, trying date range...');
      
      const startOfDay = new Date();
      startOfDay.setDate(startOfDay.getDate() - 1); // Yesterday
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setDate(endOfDay.getDate() + 1); // Tomorrow
      endOfDay.setHours(23, 59, 59, 999);
      
      todayAttendance = await Attendance.find({
        userId: { $in: leaders.map(l => l._id) },
        date: { $gte: startOfDay, $lte: endOfDay }
      }).lean();
      
      console.log('📅 Date range query results:', {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        recordsFound: todayAttendance.length,
        records: todayAttendance.map(r => ({
          userId: r.userId.toString(),
          date: r.date.toISOString(),
          status: r.status
        }))
      });
    }

    console.log('📅 Final Attendance Query Results:', {
      finalDate: usedDate?.toISOString() || 'date-range',
      leadersCount: leaders.length,
      attendanceRecordsFound: todayAttendance.length,
      attendanceDetails: todayAttendance.map(a => ({ 
        userId: a.userId.toString(), 
        status: a.status,
        date: a.date.toISOString()
      }))
    });

    // Map attendance status to leaders
    const leadersWithStatus = leaders.map(leader => {
      const attendanceRecord = todayAttendance.find(
        att => att.userId.toString() === leader._id.toString()
      );
      
      const hasRecord = !!attendanceRecord;
      const status = attendanceRecord?.status || 'Not Marked';
      
      console.log(`👤 ${leader.name}:`, {
        id: leader._id.toString(),
        hasAttendanceRecord: hasRecord,
        attendanceStatus: status,
        attendanceDate: attendanceRecord?.date?.toISOString()
      });
      
      return {
        ...leader,
        attendanceStatus: status,
        hasAttendanceRecord: hasRecord
      };
    });

    console.log('✅ Final leaders with status:', leadersWithStatus.map(l => ({
      name: l.name,
      attendanceStatus: l.attendanceStatus,
      hasRecord: l.hasAttendanceRecord
    })));

    return NextResponse.json({
      leaders: leadersWithStatus,
      success: true,
      meta: {
        totalLeaders: leaders.length,
        attendanceRecords: todayAttendance.length,
        queryDate: usedDate?.toISOString() || 'date-range',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error fetching leaders status:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}