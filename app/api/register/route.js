// app/api/register/route.js
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User"; 
import Labour from "@/models/Labour"; 
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();

    // Valid roles list - Labour වෙනම model එකේ තියනවා
    const validRoles = ['labour', 'leader', 'employee', 'hr'];
    
    // Role validation - default ව employee set කරන්න
    const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'employee';

    // මුරපදය hash කරන්න
    const hashedPassword = await bcrypt.hash(password, 10);
    await connectMongoDB();
    
    // Labour නම් Labour model එකේ, අනිත් roles User model එකේ
    if (userRole === 'labour') {
      await Labour.create({ 
        name, 
        email, 
        password: hashedPassword, 
        role: userRole 
      });
    } else {
      await User.create({ 
        name, 
        email, 
        password: hashedPassword, 
        role: userRole 
      });
    }

    return NextResponse.json({ 
      message: "පරිශීලකයා සාර්ථකව ලියාපදිංචි විය.",
      role: userRole 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "පරිශීලකයා ලියාපදිංචි කිරීමේදී දෝෂයක් ඇතිවිය." },
      { status: 500 }
    );
  }
}