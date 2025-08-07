// app/api/task-allocations/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import TaskAllocation from "@/models/TaskAllocation";
import Labour from "@/models/Labour"; // Import Labour model

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { taskId, labourIds } = await request.json();

    if (!taskId || !labourIds || !Array.isArray(labourIds) || labourIds.length === 0) {
      return NextResponse.json(
        { message: "Invalid allocation data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Get the user ID - handle both session.user.id and session.user._id
    const userId = session.user.id || session.user._id;
    
    if (!userId) {
      return NextResponse.json(
        { message: "User ID not found in session" },
        { status: 400 }
      );
    }

    // Check for existing allocations
    const existingAllocations = await TaskAllocation.find({
      task: taskId,
      labour: { $in: labourIds }
    });

    const existingLabourIds = existingAllocations.map(alloc => alloc.labour.toString());
    const newLabourIds = labourIds.filter(id => !existingLabourIds.includes(id));

    if (newLabourIds.length === 0) {
      return NextResponse.json(
        { message: "All selected labours are already allocated to this task" },
        { status: 400 }
      );
    }

    // Create new allocations
    const allocations = newLabourIds.map(labourId => ({
      task: taskId,
      labour: labourId,
      allocatedBy: userId, // Use the corrected user ID
      allocatedAt: new Date()
    }));

    const createdAllocations = await TaskAllocation.insertMany(allocations);

    // Get populated allocations
    const populatedAllocations = await TaskAllocation.find({
      _id: { $in: createdAllocations.map(alloc => alloc._id) }
    })
    .populate('labour', 'name email skills')
    .populate('task', 'title location')
    .lean();

    return NextResponse.json({
      allocations: populatedAllocations,
      message: `Successfully allocated ${newLabourIds.length} labour(s) to the task`,
      success: true
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}