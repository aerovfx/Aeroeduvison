"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export const Navbar = () => {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-4 border-b h-full flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center">
          <div className="md:hidden pr-4">
            <span className="text-xl">☰</span>
          </div>
          <div className="text-lg font-semibold">Loading...</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b h-full flex items-center justify-between bg-white shadow-sm">
      <div className="flex items-center">
        <div className="md:hidden pr-4">
          <span className="text-xl">☰</span>
        </div>
        <div className="text-lg font-semibold">Dashboard</div>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="text-sm px-3 py-1 border rounded hover:bg-gray-100">
          🌐 EN
        </button>
        
        {session ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm px-3 py-1 border rounded hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/auth/login">
            <button className="text-sm px-3 py-1 border rounded hover:bg-gray-100">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </div>
  );
};
