// app/api/tasks/bulk/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import Task from "@/models/Task";
import TaskAllocation from "@/models/TaskAllocation";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { tasks } = await request.json();

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { message: "Invalid tasks data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const createdTasks = [];
    const errors = [];

    // Get the user ID - handle both session.user.id and session.user._id
    const userId = session.user.id || session.user._id;
    
    if (!userId) {
      return NextResponse.json(
        { message: "User ID not found in session" },
        { status: 400 }
      );
    }



    // Process each task
    for (let i = 0; i < tasks.length; i++) {
      try {
        const taskData = tasks[i];
        
        // Create the task
        const newTask = new Task({
          title: taskData.title,
          description: taskData.description || taskData.groupInfo?.groupName || '',
          location: taskData.location,
          expectedManDays: taskData.expectedManDays,
          assignedLeader: taskData.assignedLeader,
          priority: taskData.priority || 'Medium',
          notes: taskData.notes || '',
          createdBy: userId, // Use the corrected user ID
          status: 'Pending'
        });

        const savedTask = await newTask.save();

        // Create labour allocations if any
        if (taskData.assignedLabours && taskData.assignedLabours.length > 0) {
          const allocations = taskData.assignedLabours.map(labourId => ({
            task: savedTask._id,
            labour: labourId,
            allocatedBy: userId,
            allocatedAt: new Date()
          }));

          await TaskAllocation.insertMany(allocations);
        }

        // Get populated task
        const populatedTask = await Task.findById(savedTask._id)
          .populate('assignedLeader', 'name email role')
          .populate('createdBy', 'name email')
          .lean();

        createdTasks.push(populatedTask);

      } catch (error) {
        errors.push({
          taskIndex: i + 1,
          error: error.message,
          taskData: tasks[i]?.title || 'Unknown task'
        });
      }
    }

    // Return results
    if (createdTasks.length === 0) {
      return NextResponse.json(
        { 
          message: "Failed to create any tasks",
          errors,
          success: false,
          debugInfo: {
            userId,
            sessionUser: session.user,
            totalTasks: tasks.length
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      tasks: createdTasks,
      message: `Successfully created ${createdTasks.length} tasks`,
      errors: errors.length > 0 ? errors : undefined,
      success: true
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { 
        message: "Server error occurred"
      },
      { status: 500 }
    );
  }
}