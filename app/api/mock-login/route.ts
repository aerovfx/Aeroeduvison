import { NextResponse } from "next/server";
import { compare } from "bcryptjs";

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

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    console.log("🔍 [MOCK-AUTH] Testing login:", email);
    
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    
    const isValid = await compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ [MOCK-AUTH] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

