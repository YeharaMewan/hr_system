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

    const { labourData, companyStats, calculatedValues, date } = await request.json();

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

    // Create comprehensive record
    const recordData = {
      leaderAllocations: labourData.map(leader => ({
        leaderId: leader.id,
        leaderName: leader.name,
        labourCount: leader.labourCount,
        tasksCount: leader.tasksCount,
        attendanceStatus: leader.attendanceStatus || 'Not Marked'
      })),
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
        date: targetDate,
        createdBy: userId 
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
    console.error("Error saving daily labour allocation:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
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
      // Get historical records with pagination
      const skip = (page - 1) * limit;
      
      const query = {};
      if (date && date !== 'all') {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        query.date = targetDate;
      }

      const [records, total] = await Promise.all([
        LabourAllocationRecord.find(query)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        LabourAllocationRecord.countDocuments(query)
      ]);

      return NextResponse.json({
        records: records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        success: true
      });
    }

  } catch (error) {
    console.error("Error fetching daily labour allocation:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}