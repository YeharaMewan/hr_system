// app/api/dashboard/auto-save/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
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

    // Get request body
    const body = await request.json();
    const { dashboardData, forceUpdate = false } = body;

    await connectMongoDB();

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if there's an existing record and if it needs updating
    const existingRecord = await LabourAllocationRecord.findOne({
      date: { $gte: today, $lte: endOfDay }
    });

    // If no changes detected and not forcing update, skip save
    if (existingRecord && !forceUpdate) {
      const lastUpdated = existingRecord.updatedAt;
      const timeDiff = new Date() - lastUpdated;
      
      // Only save if last update was more than 30 seconds ago
      if (timeDiff < 30000) {
        return NextResponse.json({
          success: true,
          message: "No save needed - recent update detected",
          data: {
            recordId: existingRecord._id,
            lastUpdated: existingRecord.updatedAt,
            skipped: true
          }
        });
      }
    }

    // Fetch current data
    const [allUsers, leaders, todayAttendance] = await Promise.all([
      User.find({ 
        role: { $in: ['leader', 'labour'] },
        isActive: { $ne: false }
      }).select('_id name role').lean(),
      
      User.find({ 
        role: 'leader',
        isActive: { $ne: false }
      }).select('_id name role').lean(),
      
      Attendance.find({
        date: { $gte: today, $lte: endOfDay }
      }).populate('userId', 'role name').select('userId status').lean()
    ]);

    // Create attendance map
    const attendanceMap = {};
    todayAttendance
      .filter(att => att.userId && att.userId.role === 'leader')
      .forEach(att => {
        attendanceMap[att.userId._id.toString()] = att.status;
      });

    // Calculate working leaders
    const workingLeaders = leaders.filter(leader => {
      const status = attendanceMap[leader._id.toString()];
      return status === 'Present' || status === 'Work from home' || status === 'Work from out of Rise';
    });

    // Get or create today's labour allocation record
    let todayRecord = await LabourAllocationRecord.findOne({
      date: { $gte: today, $lte: endOfDay }
    });

    if (!todayRecord) {
      // Create new record if doesn't exist
      todayRecord = new LabourAllocationRecord({
        date: today,
        createdBy: session.user.id,
        companyStats: [
          { name: 'Codegen + Aigrow staff\'s', count: 0, editable: true },
          { name: 'Ram studios', count: 0, editable: true },
          { name: 'Rise Technology', count: 0, editable: true }
        ],
        leaderAllocations: []
      });
    }

    // Update leader allocations with current attendance data
    const updatedLeaderAllocations = leaders.map(leader => {
      const existingAllocation = todayRecord.leaderAllocations.find(
        alloc => alloc.leaderId && alloc.leaderId.toString() === leader._id.toString()
      );

      return {
        leaderId: leader._id,
        leaderName: leader.name,
        labourCount: existingAllocation?.labourCount || 0,
        tasksCount: existingAllocation?.tasksCount || 0,
        attendanceStatus: attendanceMap[leader._id.toString()] || 'Not Marked'
      };
    });

    // Update the record
    todayRecord.leaderAllocations = updatedLeaderAllocations;
    todayRecord.totalLeaders = leaders.length;
    todayRecord.totalLabourCount = updatedLeaderAllocations.reduce(
      (total, leader) => total + (leader.labourCount || 0), 0
    );
    todayRecord.updatedBy = session.user.id;
    todayRecord.updatedAt = new Date();

    // Calculate totals
    let totalCompanyEmployees = 0;
    if (todayRecord.companyStats && todayRecord.companyStats.length > 0) {
      totalCompanyEmployees = todayRecord.companyStats.reduce(
        (total, company) => total + (company.count || 0), 0
      );
    }

    // Update calculated values
    todayRecord.calculatedValues = {
      totalLabourCount: todayRecord.totalLabourCount,
      theRiseTotalEmployees: todayRecord.totalLabourCount + workingLeaders.length + totalCompanyEmployees,
      totalCompanyEmployees: totalCompanyEmployees,
      workingLeadersCount: workingLeaders.length
    };

    // Save the record
    await todayRecord.save();

    return NextResponse.json({
      success: true,
      message: "Dashboard data auto-saved successfully",
      data: {
        recordId: todayRecord._id,
        totalEmployees: todayRecord.calculatedValues.theRiseTotalEmployees,
        workingLeaders: workingLeaders.length,
        totalLabours: todayRecord.totalLabourCount,
        companyEmployees: totalCompanyEmployees,
        lastUpdated: todayRecord.updatedAt
      }
    });

  } catch (error) {
    console.error("❌ Error in auto-save:", error);
    return NextResponse.json(
      { message: "Auto-save failed", error: error.message },
      { status: 500 }
    );
  }
}

// GET method to check auto-save status
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    await connectMongoDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayRecord = await LabourAllocationRecord.findOne({
      date: { $gte: today, $lte: endOfDay }
    }).select('updatedAt calculatedValues').lean();

    return NextResponse.json({
      success: true,
      hasRecord: !!todayRecord,
      lastUpdated: todayRecord?.updatedAt || null,
      totalEmployees: todayRecord?.calculatedValues?.theRiseTotalEmployees || 0
    });

  } catch (error) {
    console.error("❌ Error checking auto-save status:", error);
    return NextResponse.json(
      { message: "Failed to check auto-save status" },
      { status: 500 }
    );
  }
}
