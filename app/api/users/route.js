// app/api/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";

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

    // Get all users (leaders and labours)
    const users = await User.find({ 
      role: { $in: ['leader', 'labour'] }
    }).select('_id name email role skills status').lean();

    // Add default skills if missing
    const usersWithDefaults = users.map(user => ({
      ...user,
      skills: user.skills || (user.role === 'labour' ? ['General'] : ['Management']),
      status: user.status || 'active'
    }));

    return NextResponse.json({
      users: usersWithDefaults,
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    );
  }
}