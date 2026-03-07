'use client';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminSTEMClient from "./admin-stem-client";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

// Server Component - fetch data before rendering
export default async function AdminSTEMPage() {
  const { t } = useLanguage();
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

  // For now, return empty array since STEM projects are stored in localStorage
  // In the future, this could fetch from a database table
  const stemProjects: any[] = [];

  return (
    <AdminSTEMClient 
      initialProjects={stemProjects}
      userEmail={session.user.email}
    />
  );
}
