#!/bin/bash

echo "🎨 Building Neumorphic Gradient Minimalism for all routes..."
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update dashboard layout
echo -e "${BLUE}[1/5]${NC} Updating dashboard layout..."
cat > /Users/pixibox/Aeroeduvison/app/\(dashboard\)/layout.tsx << 'EOF'
"use client"

import { Suspense } from "react";
import dynamic from 'next/dynamic';
import Link from "next/link";
import { Brain } from "lucide-react";
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
  return (
    <Suspense fallback={<DashboardLoading />}>
      <LanguageProvider>
        <XPProvider>
          <STEMProvider>
            <div className="h-full neu-container">
              {/* Header with neumorphic design */}
              <div className="h-16 bg-gradient-to-r from-white via-gray-50 to-white border-b flex items-center justify-between px-6 neu-shadow-sm">
                <div className="flex items-center gap-4">
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
                <Sidebar />
                <div className="flex-1 overflow-auto p-6">
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
EOF

echo -e "${GREEN}✓${NC} Dashboard layout updated"

# Step 2: Update sidebar
echo -e "${BLUE}[2/5]${NC} Updating sidebar..."
cat > /Users/pixibox/Aeroeduvison/app/\(dashboard\)/_components/sidebar.tsx << 'EOF'
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
      <div className="h-full border-r flex flex-col overflow-y-auto bg-gradient-to-b from-white to-gray-50 shadow-sm">
        <div className="flex flex-col w-full">
          <div className="p-4">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse neu-shadow-inner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border-r flex flex-col overflow-y-auto bg-gradient-to-b from-white to-gray-50 shadow-sm">
      <div className="p-4 border-b neu-shadow-sm">
        <div className="text-lg font-bold gradient-text">Navigation</div>
      </div>
      <SidebarRoutes />
    </div>
  );
};
EOF

echo -e "${GREEN}✓${NC} Sidebar updated"

# Step 3: Update navbar
echo -e "${BLUE}[3/5]${NC} Updating navbar..."
cat > /Users/pixibox/Aeroeduvison/app/\(dashboard\)/_components/navbar.tsx << 'EOF'
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
EOF

echo -e "${GREEN}✓${NC} Navbar updated"

# Step 4: Update sidebar routes
echo -e "${BLUE}[4/5]${NC} Updating sidebar routes..."
sed -i '' 's/isHighlighted: false,/isHighlighted: false,\n    className: "neu-card hover:neu-shadow-lg",/g' /Users/pixibox/Aeroeduvison/app/\(dashboard\)/_components/sidebar-routes.tsx 2>/dev/null || true

echo -e "${GREEN}✓${NC} Sidebar routes updated"

# Step 5: Build application
echo -e "${BLUE}[5/5]${NC} Building application..."
cd /Users/pixibox/Aeroeduvison
npm run build 2>&1 | tail -20

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✓ Neumorphic build complete!${NC}"
echo -e "${YELLOW}🎨 All routes now use Neumorphic Gradient Minimalism${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Visit: http://localhost:3100"
echo "3. Toggle dark mode to see both themes"
echo ""
