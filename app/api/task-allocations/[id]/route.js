// app/api/task-allocations/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import TaskAllocation from "@/models/TaskAllocation";

// DELETE - Remove labour from task
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
        { message: "Allocation ID is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const deletedAllocation = await TaskAllocation.findByIdAndDelete(id);

    if (!deletedAllocation) {
      return NextResponse.json(
        { message: "Task allocation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Labour removed from task successfully",
      success: true
    });

  } catch (error) {
    console.error("Error removing labour allocation:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}