// app/api/task-allocations/daily/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import TaskAllocationRecord from "@/models/TaskAllocationRecord";

// Save daily task allocation data
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'hr') {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { tasks, users, summary, date } = await request.json();

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { message: "Invalid task data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const userId = session.user.id || session.user._id;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Extract leaders and labours from users
    const leaders = users ? users.filter(user => user.role === 'leader') : [];
    const labours = users ? users.filter(user => user.role === 'labour') : [];

    // Create comprehensive task allocation record
    const recordData = {
      taskAllocations: tasks.map(task => ({
        taskId: task._id,
        taskTitle: task.title,
        taskDescription: task.description,
        status: task.status,
        location: task.location,
        expectedManDays: task.expectedManDays || 1,
        assignedLeader: task.assignedLeader ? {
          leaderId: task.assignedLeader._id || task.assignedLeader,
          leaderName: task.assignedLeader.name,
          leaderEmail: task.assignedLeader.email
        } : null,
        allocatedLabours: task.allocations ? task.allocations.map(allocation => ({
          allocationId: allocation._id,
          labourId: allocation.labour._id || allocation.labour,
          labourName: allocation.labour.name,
          labourEmail: allocation.labour.email,
          skills: allocation.labour.skills || []
        })) : [],
        labourCount: task.allocations ? task.allocations.length : 0
      })),
      
      // Calculate summary statistics
      summary: {
        totalTasks: tasks.length,
        totalAllocatedLabours: tasks.reduce((total, task) => 
          total + (task.allocations ? task.allocations.length : 0), 0
        ),
        tasksByStatus: {
          pending: tasks.filter(task => task.status === 'Pending').length,
          inProgress: tasks.filter(task => task.status === 'In Progress').length,
          completed: tasks.filter(task => task.status === 'Completed').length,
          onHold: tasks.filter(task => task.status === 'On Hold').length
        },
        activeLeaders: leaders.length,
        availableLabours: labours.length
      },

      updatedAt: new Date(),
      updatedBy: userId
    };

    // Create or update the record
    const record = await TaskAllocationRecord.findOneAndUpdate(
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
      message: "Daily task allocation saved successfully",
      record: {
        _id: record._id,
        date: record.date,
        summary: record.summary,
        metrics: record.metrics,
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

// Get daily task allocation data
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

      const record = await TaskAllocationRecord.findOne({ 
        date: targetDate 
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('taskAllocations.taskId')
      .populate('taskAllocations.assignedLeader.leaderId', 'name email')
      .populate('taskAllocations.allocatedLabours.labourId', 'name email skills')
      .lean();

      return NextResponse.json({
        record: record,
        success: true
      });
    } else {
      // Get historical record for specific date
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      const record = await TaskAllocationRecord.findOne({ 
        date: targetDate 
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('taskAllocations.taskId')
      .populate('taskAllocations.assignedLeader.leaderId', 'name email')
      .populate('taskAllocations.allocatedLabours.labourId', 'name email skills')
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
