// app/api/users/leaders/route.js
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

    // Get only leaders
    const leaders = await User.find({ 
      role: 'leader'
    }).select('_id name email role skills status').lean();

    // Add default skills if missing
    const leadersWithDefaults = leaders.map(leader => ({
      ...leader,
      skills: leader.skills || ['Management'],
      status: leader.status || 'active'
    }));

    return NextResponse.json({
      data: leadersWithDefaults,  // 'users' වෙනුවට 'data' භාවිතා කරන්න attendance API එකට ගැලපෙන්න
      success: true
    });

  } catch (error) {
    console.error("Error fetching leaders:", error);
    return NextResponse.json(
      { message: "Server error occurred", error: error.message },
      { status: 500 }
    );
  }
}