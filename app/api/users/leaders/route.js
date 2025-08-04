// app/api/users/leaders/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  // Temporary response until you create the proper API
  return NextResponse.json({
    leaders: [],
    success: true,
    message: "No leaders found - API under development"
  });
}