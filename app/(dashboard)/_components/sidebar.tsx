"use client"

import { useState, useEffect } from "react";
import { SidebarRoutes } from "./sidebar-routes";

export const Sidebar = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full border-r flex flex-col overflow-y-auto bg-white shadow-sm">
        <div className="flex flex-col w-full">
          <div className="p-4">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border-r flex flex-col overflow-y-auto bg-white shadow-sm">
      <SidebarRoutes />
    </div>
  );
};
