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
      <div className="p-4 border-b h-full flex items-center justify-between bg-gradient-to-r from-white via-gray-50 to-white shadow-sm">
        <div className="flex items-center">
          <div className="md:hidden pr-4">
            <span className="text-xl">☰</span>
          </div>
          <div className="text-lg font-semibold gradient-text">Loading...</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse neu-shadow-inner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b h-full flex items-center justify-between bg-gradient-to-r from-white via-gray-50 to-white shadow-sm neu-shadow-sm">
      <div className="flex items-center">
        <div className="md:hidden pr-4">
          <span className="text-xl">☰</span>
        </div>
        <div className="text-lg font-semibold gradient-text">Dashboard</div>
      </div>

      <div className="flex items-center gap-2">
        <button className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-100 neu-shadow transition-all">
          🌐 EN
        </button>

        {session ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm neu-shadow">
              {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-100 neu-shadow transition-all"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/auth/login">
            <button className="text-sm px-3 py-1 border rounded-lg hover:bg-gray-100 neu-shadow transition-all">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </div>
  );
};
