"use client"

import { useState, useEffect } from "react";
import { SidebarRoutes } from "./sidebar-routes";

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full border-r flex flex-col overflow-y-auto bg-gradient-to-b from-white to-gray-50 shadow-sm transition-all duration-300" style={{ width: '280px' }}>
        <div className="flex flex-col w-full">
          <div className="p-4">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse neu-shadow-inner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full border-r flex flex-col overflow-y-auto bg-gradient-to-b from-white to-gray-50 shadow-sm transition-all duration-300"
      style={{
        width: isOpen ? '280px' : '0px',
        opacity: isOpen ? 1 : 0,
        overflow: isOpen ? 'visible' : 'hidden',
      }}
    >
      {isOpen && (
        <>
          <div className="p-4 border-b neu-shadow-sm">
            <div className="text-lg font-bold gradient-text">Navigation</div>
          </div>
          <SidebarRoutes />
        </>
      )}
    </div>
  );
};
