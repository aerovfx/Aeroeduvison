"use client"

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Command, Search, Sparkles, ArrowRight } from "lucide-react";
import { XPProvider } from "@/contexts/XPContext";
import { STEMProvider } from "@/contexts/STEMContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserMenu } from "@/components/user-menu";
import { Sidebar } from "./_components/sidebar";
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { TranscriptSidebar } from '@/components/transcript/TranscriptSidebar';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const ChatbotWidget = dynamic(() => import('@/components/chatbot/ChatbotWidget'), { ssr: false });

/* ── Quick-navigate routes for Command Palette ── */
const quickRoutes = [
  { label: "Dashboard", href: "/dashboard", section: "Overview" },
  { label: "Analytics", href: "/dashboard/analytics", section: "Overview" },
  { label: "Achievements", href: "/dashboard/achievements", section: "Overview" },
  { label: "Gia Sư AI", href: "/student/ai-tutor", section: "Learning" },
  { label: "Learning Path", href: "/learning-paths", section: "Learning" },
  { label: "Ôn thi", href: "/student/exam-prep", section: "Learning" },
  { label: "Hướng nghiệp", href: "/student/career", section: "Learning" },
  { label: "Tiến độ", href: "/student/progress", section: "Tracking" },
  { label: "Cảm xúc", href: "/dashboard/emotion", section: "Tracking" },
  { label: "LabTwin", href: "/dashboard/labtwin", section: "Labs & Tools" },
  { label: "STEM Projects", href: "/dashboard/stem", section: "Labs & Tools" },
  { label: "Ghi chú", href: "/dashboard/notes", section: "Labs & Tools" },
  { label: "Scrum Board", href: "/dashboard/scrumboard", section: "Labs & Tools" },
  { label: "Cài đặt Agent", href: "/student/agent-settings", section: "Settings" },
];

function DashboardLoading() {
  return (
    <div className="h-full flex items-center justify-center neu-container">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(245,85%,65%)] animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[hsl(175,80%,50%)] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
        <p className="text-sm text-[hsl(215,15%,55%)]">Initializing AI workspace...</p>
      </div>
    </div>
  );
}

/* ── Command Palette ── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = quickRoutes.filter(r =>
    r.label.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, typeof quickRoutes>>((acc, r) => {
    (acc[r.section] ??= []).push(r);
    return acc;
  }, {});

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="command-palette-overlay animate-fade-in" onClick={onClose}>
      <div className="command-palette animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions, AI agents..."
            className="!border-0 !p-3 !text-sm"
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0].href);
            }}
          />
          <kbd className="text-[0.6rem] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border flex-shrink-0">ESC</kbd>
        </div>
        <div className="overflow-y-auto max-h-[320px] p-2">
          {Object.entries(grouped).map(([section, routes]) => (
            <div key={section}>
              <div className="section-label">{section}</div>
              {routes.map(r => (
                <button
                  key={r.href}
                  onClick={() => handleSelect(r.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
                >
                  <span className="flex-1 text-left">{r.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Layout ── */
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl/Cmd + K → command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setCmdOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Suspense fallback={<DashboardLoading />}>
      <LanguageProvider>
        <XPProvider>
          <STEMProvider>
            <div className="h-full neu-container">
              {/* ── AI Native Header ── */}
              <header className="h-14 flex items-center justify-between px-5 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-3">
                  {/* Logo */}
                  <Link href="/dashboard" className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center shadow-[0_0_12px_rgba(120,100,255,0.3)] group-hover:shadow-[0_0_20px_rgba(120,100,255,0.5)] transition-shadow">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[0.9375rem] font-semibold gradient-text">AeroEdu</span>
                  </Link>

                  {/* AI status */}
                  <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-full bg-muted/80 border border-border">
                    <div className="ai-status-dot" />
                    <span className="text-[0.625rem] font-medium text-[hsl(175,80%,50%)]">AI Active</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Command Palette trigger */}
                  <button
                    onClick={() => setCmdOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border hover:bg-muted hover:border-border transition-all text-muted-foreground hover:text-foreground group"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="text-xs hidden sm:inline">Search</span>
                    <div className="flex items-center gap-0.5">
                      <kbd className="text-[0.6rem] px-1 py-0.5 rounded bg-muted border border-border leading-none">⌘</kbd>
                      <kbd className="text-[0.6rem] px-1 py-0.5 rounded bg-muted border border-border leading-none">K</kbd>
                    </div>
                  </button>

                  <ThemeToggle />
                  <LanguageSwitcherCompact />
                  <UserMenu />
                </div>
              </header>

              {/* ── Content Area ── */}
              <div className="flex h-[calc(100vh-3.5rem)]">
                <Sidebar isOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 overflow-auto transition-all duration-300">
                  <div className="p-5 min-h-full">
                    {children}
                  </div>
                </main>
              </div>

              {/* Command Palette */}
              <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

              <ChatbotWidget />
              
              {/* Video Transcript Sidebar */}
              <TranscriptSidebar />
            </div>
          </STEMProvider>
        </XPProvider>
      </LanguageProvider>
    </Suspense>
  );
};

export default DashboardLayout;
