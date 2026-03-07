"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export const AdminNavbarRoutes = () => {
  const { data: session } = useSession();
  const { t } = useLanguage();

  return (
    <div className="flex gap-x-2 ml-auto">
      <LanguageToggle />
      {session ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                {session.user?.email}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={async () => {
              console.log('🚪 SignOut clicked');
              try {
                // SignOut without redirect first
                const result = await signOut({ 
                  callbackUrl: '/',
                  redirect: false 
                });
                console.log('🔑 SignOut result:', result);
                // Force redirect after signOut
                console.log('🔄 Redirecting to homepage...');
                window.location.href = '/';
              } catch (error) {
                console.error('❌ SignOut error:', error);
                // Fallback: force redirect
                window.location.href = '/';
              }
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      ) : null}
    </div>
  );
};
