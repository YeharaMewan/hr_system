// app/api/register/route.js
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User"; 
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();

    // Valid roles list
    const validRoles = ['labour', 'hr', 'leader'];
    
    // Role validation - default ව labour set කරන්න
    const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'labour';

    // මුරපදය hash කරන්න
    const hashedPassword = await bcrypt.hash(password, 10);
    await connectMongoDB();
    
    // නව පරිශීලකයා දත්ත සමුදායට ඇතුලත් කරන්න
    await User.create({ 
      name, 
      email, 
      password: hashedPassword, 
      role: userRole 
    });

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