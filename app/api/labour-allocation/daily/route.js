// app/api/labour-allocation/daily/route.js - UPDATED

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import LabourAllocationRecord from "@/models/LabourAllocationRecord";

// ✅ Helper function to get proper date range for Sri Lanka timezone
function getSriLankaDateRange(dateString) {
  // Sri Lanka timezone offset: +05:30
  const SRI_LANKA_OFFSET = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  
  let targetDate;
  
  if (dateString) {
    // Parse the provided date string
    targetDate = new Date(dateString);
  } else {
    // Get today's date
    targetDate = new Date();
  }
  
  // ✅ Create Sri Lanka timezone date range
  // Start: 00:00:00 Sri Lanka time
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // End: 23:59:59 Sri Lanka time  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // ✅ Convert to UTC for MongoDB query
  // MongoDB stores in UTC, so we need to subtract Sri Lanka offset
  const utcStartOfDay = new Date(startOfDay.getTime() - SRI_LANKA_OFFSET);
  const utcEndOfDay = new Date(endOfDay.getTime() - SRI_LANKA_OFFSET);
  
  return {
    startOfDay: utcStartOfDay,
    endOfDay: utcEndOfDay,
    localStartOfDay: startOfDay,
    localEndOfDay: endOfDay
  };
}

// ✅ Alternative: Better approach using proper timezone handling
function getSriLankaDateRangeV2(dateString) {
  // Use Intl API for proper timezone handling
  const timeZone = 'Asia/Colombo';
  
  let targetDate;
  if (dateString) {
    targetDate = new Date(dateString);
  } else {
    targetDate = new Date();
  }
  
  // ✅ Get the date in Sri Lanka timezone
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();
  
  // Create start and end times in Sri Lanka timezone
  const startOfDay = new Date();
  startOfDay.setFullYear(year, month, day);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setFullYear(year, month, day);
  endOfDay.setHours(23, 59, 59, 999);
  
  // ✅ Convert to UTC by getting timezone offset
  const sriLankaOffset = 5.5 * 60; // 5.5 hours in minutes
  const currentOffset = startOfDay.getTimezoneOffset(); // Server timezone offset in minutes
  const offsetDifference = (currentOffset + sriLankaOffset) * 60 * 1000; // Convert to milliseconds
  
  const utcStartOfDay = new Date(startOfDay.getTime() - offsetDifference);
  const utcEndOfDay = new Date(endOfDay.getTime() - offsetDifference);
  
  return {
    startOfDay: utcStartOfDay,
    endOfDay: utcEndOfDay,
    localDate: `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`
  };
}

// ✅ UPDATED GET method with proper Sri Lanka timezone handling
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
    const date = searchParams.get('date');

    // ✅ Use Sri Lanka timezone-aware date range
    const { startOfDay, endOfDay, localDate } = getSriLankaDateRangeV2(date);

    // ✅ Query using proper UTC range
    const record = await LabourAllocationRecord.findOne({ 
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('leaderAllocations.leaderId', 'name email')
    .sort({ createdAt: -1 }) // Get latest record of the day
    .lean();

    return NextResponse.json({
      record: record,
      success: true,
      debug: {
        requestedDate: date,
        localDate: localDate,
        searchRange: {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString()
        }
      }
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        message: "Server error occurred: " + error.message,
        success: false,
        error: error.stack
      },
      { status: 500 }
    );
  }
}

// ✅ UPDATED POST method with Sri Lanka timezone
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      labourData, 
      companyStats, 
      calculatedValues, 
      date, 
      attendanceData 
    } = body;

    await connectMongoDB();

    const userId = session.user.id || session.user._id;
    
    // ✅ Use Sri Lanka timezone for date handling
    const { startOfDay, endOfDay, localDate } = getSriLankaDateRangeV2(date);
    
    // ✅ Check for existing record using proper date range
    const existingRecord = await LabourAllocationRecord.findOne({
      createdBy: userId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // ✅ Prepare record data with Sri Lanka date
    const targetDate = date ? new Date(date) : new Date();
    
    const recordData = {
      date: targetDate, // Keep original date for display
      leaderAllocations: labourData ? labourData.map(leader => ({
        leaderId: leader.id,
        leaderName: leader.name,
        labourCount: leader.labourCount || 0,
        tasksCount: leader.tasksCount || 0,
        attendanceStatus: leader.attendanceStatus || 'Not Marked'
      })) : [],
      companyStats: companyStats || [
        { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
        { name: 'Ram studios', count: 0, editable: true },
        { name: 'Rise Technology', count: 0, editable: true }
      ],
      calculatedValues: calculatedValues || {},
      totalLabourCount: labourData ? labourData.reduce((total, leader) => total + (leader.labourCount || 0), 0) : 0,
      totalLeaders: labourData ? labourData.length : 0,
      updatedAt: new Date(),
      updatedBy: userId
    };

    let record;
    
    if (existingRecord) {
      // ✅ Update existing record
      record = await LabourAllocationRecord.findByIdAndUpdate(
        existingRecord._id,
        recordData,
        {
          new: true,
          runValidators: true
        }
      );
    } else {
      // ✅ Create new record
      record = new LabourAllocationRecord({
        ...recordData,
        createdBy: userId
      });
      
      await record.save();
    }

    return NextResponse.json({
      message: "Daily labour allocation saved successfully",
      record: {
        _id: record._id,
        date: record.date,
        totalLabourCount: record.totalLabourCount,
        totalLeaders: record.totalLeaders,
        calculatedValues: record.calculatedValues,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      },
      success: true
    });

  } catch (error) {
    
    return NextResponse.json(
      { 
        message: "Server error occurred: " + error.message,
        success: false,
        error: error.stack
      },
      { status: 500 }
    );
  }
}