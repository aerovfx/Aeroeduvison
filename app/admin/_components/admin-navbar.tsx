"use client";

import { AdminNavbarRoutes } from "@/components/admin-navbar-routes";
import { MobileAdminSidebar } from "./mobile-admin-sidebar";

export const AdminNavbar = () => {
  return (
    <div className="p-4 border-b h-full flex items-center bg-white shadow-sm">
      <MobileAdminSidebar />
      <AdminNavbarRoutes />
    </div>
  )
}















