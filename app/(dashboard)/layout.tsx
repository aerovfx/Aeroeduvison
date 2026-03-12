"use client"

import { Suspense, useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { Brain, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { XPProvider } from "@/contexts/XPContext";
import { STEMProvider } from "@/contexts/STEMContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserMenu } from "@/components/user-menu";
import { Sidebar } from "./_components/sidebar";
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

const ChatbotWidget = dynamic(() => import('@/components/chatbot/ChatbotWidget'), { ssr: false });

function DashboardLoading() {
  return (
    <div className="h-full flex items-center justify-center neu-container">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4 neu-shadow"></div>
        <p className="text-gray-600 gradient-text">Loading dashboard...</p>
      </div>
    </div>
  );
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Keyboard shortcut: Ctrl/Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Suspense fallback={<DashboardLoading />}>
      <LanguageProvider>
        <XPProvider>
          <STEMProvider>
            <div className="h-full neu-container">
              {/* Header with neumorphic design */}
              <div className="h-16 bg-gradient-to-r from-white via-gray-50 to-white border-b flex items-center justify-between px-6 neu-shadow-sm">
                <div className="flex items-center gap-4">
                  {/* Sidebar Toggle Button */}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="neu-button p-2 rounded-xl transition-all duration-300 relative group"
                    style={{
                      background: 'var(--neu-button-bg)',
                      border: '1px solid var(--neu-border)',
                      boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)',
                      color: 'var(--neu-text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)';
                    }}
                    title="Toggle Sidebar (Ctrl+B)"
                  >
                    {sidebarOpen ? (
                      <PanelLeftClose className="w-5 h-5" />
                    ) : (
                      <PanelLeftOpen className="w-5 h-5" />
                    )}
                    {/* Tooltip */}
                    <span
                      className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4)',
                      }}
                    >
                      {sidebarOpen ? 'Đóng sidebar (Ctrl+B)' : 'Mở sidebar (Ctrl+B)'}
                    </span>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center neu-shadow rounded-xl">
                      <Brain className="w-6 h-6 text-gray-700" />
                    </div>
                    <h1 className="text-xl font-bold gradient-text animate-gradient-pulse">
                      AeroEdu
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/docs/beginner/index" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                    📚 Docs
                  </Link>
                  <LanguageSwitcherCompact />
                  <UserMenu />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex h-[calc(100vh-4rem)]">
                <Sidebar isOpen={sidebarOpen} />
                <div className={`flex-1 overflow-auto p-6 transition-all duration-300 ${sidebarOpen ? '' : 'ml-0'}`}>
                  <div className="neu-card p-6 min-h-full">
                    {children}
                  </div>
                </div>
              </div>

              <ChatbotWidget />
            </div>
          </STEMProvider>
        </XPProvider>
      </LanguageProvider>
    </Suspense>
  );
};

export default DashboardLayout;
