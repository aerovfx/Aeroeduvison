import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("🔍 [DEBUG-DB] Testing database connection...");
    console.log("🔍 [DEBUG-DB] DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
    
    // Test simple query
    const userCount = await db.user.count();
    console.log("✅ [DEBUG-DB] Database connection successful, user count:", userCount);
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      userCount,
      databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET"
    });
  } catch (error) {
    console.error("❌ [DEBUG-DB] Database connection failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET"
    }, { status: 500 });
  }
}
