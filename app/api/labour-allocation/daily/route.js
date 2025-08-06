// app/api/labour-allocation/daily/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import LabourAllocationRecord from "@/models/LabourAllocationRecord";

// Save daily labour allocation data
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { labourData, companyStats, calculatedValues, date, attendanceData } = await request.json();

    if (!labourData || !Array.isArray(labourData)) {
      return NextResponse.json(
        { message: "Invalid labour data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const userId = session.user.id || session.user._id;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get attendance data for the specific date if not provided
    let finalAttendanceData = attendanceData;
    if (!attendanceData) {
      try {
        const attendanceResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/attendance/daily?date=${targetDate.toISOString().split('T')[0]}`);
        const attendanceResult = await attendanceResponse.json();
        if (attendanceResult.success) {
          finalAttendanceData = attendanceResult.leaders;
        }
      } catch (err) {
        // Silent fallback if attendance data is not available
      }
    }

    // Create comprehensive record with attendance status
    const recordData = {
      leaderAllocations: labourData.map(leader => {
        // Find attendance status for this leader
        const attendanceRecord = finalAttendanceData 
          ? finalAttendanceData.find(att => att._id?.toString() === leader.id?.toString() || att.userId?.toString() === leader.id?.toString())
          : null;
          
        return {
          leaderId: leader.id,
          leaderName: leader.name,
          labourCount: leader.labourCount,
          tasksCount: leader.tasksCount,
          attendanceStatus: attendanceRecord ? attendanceRecord.attendanceStatus : (leader.attendanceStatus || 'Not Marked')
        };
      }),
      companyStats: companyStats || [
        { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
        { name: 'Ram studios', count: 0, editable: true },
        { name: 'Rise Technology', count: 0, editable: true }
      ],
      // Add calculated values for historical tracking
      calculatedValues: calculatedValues || {},
      totalLabourCount: labourData.reduce((total, leader) => total + leader.labourCount, 0),
      totalLeaders: labourData.length,
      updatedAt: new Date(),
      updatedBy: userId
    };

    // Create or update the record
    const record = await LabourAllocationRecord.findOneAndUpdate(
      { 
        date: targetDate
      },
      recordData,
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    return NextResponse.json({
      message: "Daily labour allocation saved successfully",
      record: {
        _id: record._id,
        date: record.date,
        totalLabourCount: record.totalLabourCount,
        totalLeaders: record.totalLeaders,
        calculatedValues: record.calculatedValues,
        updatedAt: record.updatedAt
      },
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred", success: false },
      { status: 500 }
    );
  }
}

// Get daily labour allocation data
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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    if (date === 'today' || date === new Date().toISOString().split('T')[0]) {
      // Get today's record
      const targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);

      const record = await LabourAllocationRecord.findOne({ 
        date: targetDate 
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('leaderAllocations.leaderId', 'name email')
      .lean();

      return NextResponse.json({
        record: record,
        success: true
      });
    } else {
      // Get historical record for specific date
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      const record = await LabourAllocationRecord.findOne({ 
        date: targetDate 
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('leaderAllocations.leaderId', 'name email')
      .lean();

      return NextResponse.json({
        record: record,
        success: true
      });
    }

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred", success: false },
      { status: 500 }
    );
  }
}