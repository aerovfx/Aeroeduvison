import { Navbar } from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";
import { STEMProvider } from "@/contexts/STEMContext";
import { XPProvider } from "@/contexts/XPContext";
import { DataSyncProvider } from "@/contexts/DataSyncContext";
import { CompetitionProvider } from "@/contexts/CompetitionContext";
// import { ChatProvider } from "@/contexts/ChatContext"; // Temporarily disabled
// ThemeProvider already provided in root layout

const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <DataSyncProvider>
      <XPProvider>
        <STEMProvider>
          <CompetitionProvider>
            {/* <ChatProvider> */}
              <div className="h-full">
                <div className="h-[80px] md:pl-56 fixed inset-y-0 w-full z-50">
                  <Navbar />
                </div>
                <div className="hidden md:flex h-full w-56 flex-col fixed inset-y-0 z-50">
                  <Sidebar />
                </div>
                <main className="md:pl-56 pt-[80px] h-full">
                  {children}
                </main>
              </div>
            {/* </ChatProvider> */}
          </CompetitionProvider>
        </STEMProvider>
      </XPProvider>
    </DataSyncProvider>
  );
}
 
export default DashboardLayout;