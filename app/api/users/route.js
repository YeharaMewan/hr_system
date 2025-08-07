// app/api/users/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import Labour from "@/models/Labour";

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

    // Get all users (leaders and employees) and labours separately
    const [users, labours] = await Promise.all([
      User.find({}).select('_id name email role skills status').lean(),
      Labour.find({}).select('_id name email role skills status').lean()
    ]);

    // Combine users and labours
    const allUsers = [...users, ...labours];

    // Add default skills if missing
    const usersWithDefaults = allUsers.map(user => ({
      ...user,
      skills: user.skills || (user.role === 'labour' ? ['General'] : user.role === 'leader' ? ['Management'] : user.role === 'hr' ? ['HR Management'] : ['General']),
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