// app/api/tasks/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import Task from "@/models/Task";
import TaskAllocation from "@/models/TaskAllocation";
import Labour from "@/models/Labour"; // Import Labour model

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    let query = {};
    
    // If date is provided, filter tasks by creation date
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Get all tasks with populated data and date filter
    const tasks = await Task.find(query)
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
    return NextResponse.json(
      { message: "Server error occurred", success: false },
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
    return NextResponse.json(
      { message: "Server error occurred", success: false },
      { status: 500 }
    );
  }
}