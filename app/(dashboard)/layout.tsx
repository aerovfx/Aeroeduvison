"use client"

import { Suspense } from "react";
import dynamic from 'next/dynamic';
import { Brain } from "lucide-react";
import { XPProvider } from "@/contexts/XPContext";
import { STEMProvider } from "@/contexts/STEMContext";
import { UserMenu } from "@/components/user-menu";
import { Sidebar } from "./_components/sidebar";
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

// Dynamic import to avoid hydration mismatch
const ChatbotWidget = dynamic(() => import('@/components/chatbot/ChatbotWidget'), {
  ssr: false
});

// Loading fallback
function DashboardLoading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <XPProvider>
        <STEMProvider>
          <div className="h-full">
            <style jsx>{`
              @keyframes gradient-x {
                0%, 100% {
                  background-position: 0% 50%;
                }
                50% {
                  background-position: 100% 50%;
                }
              }
              
              .animate-gradient-x {
                animation: gradient-x 4s ease infinite;
              }
            `}</style>
            {/* Simple Header */}
            <div className="h-16 bg-white border-b flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-gray-700" />
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
                    AeroEdu
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">Dashboard</div>
                <LanguageSwitcherCompact />
                <UserMenu />
              </div>
            </div>

            {/* AI-Driven Sidebar */}
            <div className="flex h-[calc(100vh-4rem)]">
              <Sidebar />

              {/* Main Content */}
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </div>

            {/* Chatbot Widget */}
            <ChatbotWidget />
          </div>
        </STEMProvider>
      </XPProvider>
    </Suspense>
  );
}

export default DashboardLayout;