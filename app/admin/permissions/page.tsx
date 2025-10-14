"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PermissionMatrix } from "@/components/admin/permission-matrix";

export default function AdminPermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/sign-in");
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="p-6">
      <PermissionMatrix />
    </div>
  );
}















