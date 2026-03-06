import { NextResponse } from "next/server";

// Mock database for testing
const mockUsers = [
  {
    id: "1",
    email: "student@example.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    name: "Test Student",
    role: "STUDENT"
  },
  {
    id: "2", 
    email: "teacher@example.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    name: "Test Teacher",
    role: "TEACHER"
  }
];

export async function GET() {
  try {
    console.log("🔍 [MOCK-DB] Testing mock database...");
    
    return NextResponse.json({
      success: true,
      message: "Mock database connection successful",
      userCount: mockUsers.length,
      users: mockUsers.map(u => ({ id: u.id, email: u.email, role: u.role }))
    });
  } catch (error) {
    console.error("❌ [MOCK-DB] Mock database error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
