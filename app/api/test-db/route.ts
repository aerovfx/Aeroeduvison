import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Attempt to query the database
    const userCount = await db.user.count();

    // Also try to get environment variables to verify they are loaded
    const dbUrl = process.env.DATABASE_URL ? "Set" : "Not Set";
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const googleClientId = process.env.GOOGLE_CLIENT_ID ? "Set" : "Not Set";

    return NextResponse.json({
      status: "OK",
      dbConnection: "Connected",
      userCount,
      env: {
        DATABASE_URL: dbUrl,
        NEXTAUTH_URL: nextAuthUrl,
        GOOGLE_CLIENT_ID: googleClientId,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error("Database Connection Error:", error);
    return NextResponse.json({
      status: "ERROR",
      dbConnection: "Failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : null,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? "Set (Check logs for connectivity)" : "Not Set",
      }
    }, { status: 500 });
  }
}