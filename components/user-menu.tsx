"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { useSession, signOut } from "next-auth/react"
import { LogOut, User, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

function UserMenuComponent() {
  const [mounted, setMounted] = useState(false)
  const { data: session, status } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debug logging disabled for cleaner console
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.log("🔍 [USERMENU] Status:", status)
  //     if (session) {
  //       console.log("🔍 [USERMENU] User:", session.user?.name, session.user?.role)
  //     }
  //   }
  // }, [status])

  // Get user reference - hooks must be called unconditionally
  const user = session?.user

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Memoize calculations - always call these hooks
  const initials = useMemo(() => {
    if (!user?.name && !user?.email) return "U"
    
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email?.[0]?.toUpperCase() || "U"
  }, [user?.name, user?.email])

  const getRoleBadgeColor = useCallback((role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500"
      case "TEACHER":
        return "bg-blue-500"
      case "STUDENT":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }, [])

  const getRoleLabel = useCallback((role: string) => {
    switch (role) {
      case "ADMIN":
        return "Quản trị viên"
      case "TEACHER":
        return "Giảng viên"
      case "STUDENT":
        return "Học viên"
      default:
        return role
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    console.log("🚪 [LOGOUT] Signing out...")
    
    try {
      // Clear NextAuth cookies and session
      await signOut({ 
        callbackUrl: "/auth/login",
        redirect: false // Prevent automatic redirect
      })
      
      // Clear browser storage
      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.clear()
        
        // Clear sessionStorage
        sessionStorage.clear()
        
        // Clear any cached data
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
        }
        
        // Force reload to clear any remaining cache
        window.location.href = "/auth/login"
      }
    } catch (error) {
      console.error("❌ [LOGOUT] Error during sign out:", error)
      // Force redirect even if signOut fails
      if (typeof window !== 'undefined') {
        window.location.href = "/auth/login"
      }
    }
  }, [])

  // NOW we can do conditional returns - after all hooks are called
  if (!mounted) {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
    )
  }

  if (status === "loading") {
    return (
      <div className="w-8 h-8 bg-blue-200 rounded-full animate-pulse"></div>
    )
  }

  if (!user) {
    // No user logged in, show sign in button
    return (
      <a href="/auth/login">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </a>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${getRoleBadgeColor(
              user.role
            )}`}
          >
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                user.role === "ADMIN" ? "bg-red-100 text-red-800" :
                user.role === "TEACHER" ? "bg-blue-100 text-blue-800" :
                "bg-green-100 text-green-800"
              }`}>
                {getRoleLabel(user.role)}
              </span>
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/dashboard/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Hồ sơ cá nhân</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/dashboard/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Cài đặt</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Export memoized version to prevent unnecessary re-renders
export const UserMenu = memo(UserMenuComponent)

