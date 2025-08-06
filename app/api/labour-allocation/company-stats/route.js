// app/api/labour-allocation/company-stats/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import LabourAllocationRecord from "@/models/LabourAllocationRecord";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { stats } = await request.json();

    if (!stats || !Array.isArray(stats)) {
      return NextResponse.json(
        { message: "Invalid stats data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const userId = session.user.id || session.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ FIX: Proper upsert operation
    const record = await LabourAllocationRecord.findOneAndUpdate(
      { 
        date: today
        // ⚠️ Remove createdBy from query - එකම date එකට multiple users create කරන්න පුළුවන්
      },
      {
        companyStats: stats,
        updatedAt: new Date(),
        updatedBy: userId,
        // ✅ ADD: Set createdBy if creating new record
        $setOnInsert: {
          createdBy: userId,
          date: today,
          leaderAllocations: [],
          totalLabourCount: 0,
          totalLeaders: 0
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    return NextResponse.json({
      message: "Company stats saved successfully",
      record: {
        _id: record._id,
        date: record.date,
        companyStats: record.companyStats,
        updatedAt: record.updatedAt
      },
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}

// ✅ ADD: Improve GET method as well
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

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get latest record for the date (any user)
    const record = await LabourAllocationRecord.findOne({ 
      date: targetDate 
    })
    .sort({ updatedAt: -1 }) // Get most recently updated
    .populate('createdBy', 'name email')
    .lean();

    if (!record) {
      return NextResponse.json({
        message: "No record found for the specified date",
        stats: [
          { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
          { name: 'Ram studios', count: 0, editable: true },
          { name: 'Rise Technology', count: 0, editable: true }
        ],
        success: true
      });
    }

    return NextResponse.json({
      stats: record.companyStats,
      record: record,
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}