import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminUsersClient from "./admin-users-client";

// Server Component - fetch data before rendering
export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  });

  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch users data from database
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  // Transform data for client component
  const transformedUsers = users.map(user => ({
    id: user.id,
    name: user.name || '',
    email: user.email,
    phone: '', // Not in schema yet
    role: { name: user.role, permissions: [] }, // Default permissions
    status: 'active' as const,
    emailVerified: true,
    phoneVerified: false,
    permissions: [],
    stats: {
      coursesCompleted: 0,
      totalStudyTime: 0,
      achievements: 0,
      streak: 0
    },
    preferences: {
      language: 'vi',
      theme: 'system' as const,
      notifications: true
    },
    lastActive: user.updatedAt,
    joinDate: user.createdAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }));

  return (
    <AdminUsersClient 
      initialUsers={transformedUsers}
      userEmail={session.user.email}
    />
  );
}
