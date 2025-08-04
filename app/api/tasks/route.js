// app/api/tasks/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import Task from "@/models/Task";
import TaskAllocation from "@/models/TaskAllocation";

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

    // Get all tasks with populated data
    const tasks = await Task.find({})
      .populate('assignedLeader', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Get allocations for each task
    const tasksWithAllocations = await Promise.all(
      tasks.map(async (task) => {
        const allocations = await TaskAllocation.find({ task: task._id })
          .populate('labour', 'name email skills')
          .lean();

        return {
          ...task,
          allocations: allocations || []
        };
      })
    );

    return NextResponse.json({
      tasks: tasksWithAllocations,
      success: true
    });

  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}

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
      title,
      description,
      location,
      expectedManDays,
      assignedLeader,
      priority = 'Medium',
      notes
    } = body;

    await connectMongoDB();

    // Get the user ID - handle both session.user.id and session.user._id
    const userId = session.user.id || session.user._id;
    
    if (!userId) {
      return NextResponse.json(
        { message: "User ID not found in session" },
        { status: 400 }
      );
    }

    const newTask = new Task({
      title,
      description,
      location,
      expectedManDays,
      assignedLeader,
      priority,
      notes,
      createdBy: userId, // Use the corrected user ID
      status: 'Pending'
    });

    const savedTask = await newTask.save();
    
    // Populate the saved task
    const populatedTask = await Task.findById(savedTask._id)
      .populate('assignedLeader', 'name email role')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json({
      task: populatedTask,
      message: "Task created successfully",
      success: true
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}