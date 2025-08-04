// app/api/users/labours/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  // Temporary response until you create the proper API  
  return NextResponse.json({
    labours: [],
    success: true,
    message: "No labours found - API under development"
  });
}