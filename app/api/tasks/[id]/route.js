// app/api/tasks/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import Task from "@/models/Task";
import TaskAllocation from "@/models/TaskAllocation";

// PUT - Update task
export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Await params in Next.js 15
    const params = await context.params;
    const { id } = params;
    const updates = await request.json();

    await connectMongoDB();

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('assignedLeader', 'name email role')
     .populate('createdBy', 'name email');

    if (!updatedTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      task: updatedTask,
      message: "Task updated successfully",
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Delete task
export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Await params in Next.js 15
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { message: "Task ID is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Delete task allocations first
    await TaskAllocation.deleteMany({ task: id });

    // Delete the task
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Task deleted successfully",
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}