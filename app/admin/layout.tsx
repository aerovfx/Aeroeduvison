import { AdminNavbar } from "./_components/admin-navbar";
import { AdminSidebar } from "./_components/admin-sidebar";
import { DataSyncProvider } from "@/contexts/DataSyncContext";
import { CompetitionProvider } from "@/contexts/CompetitionContext";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DataSyncProvider>
      <CompetitionProvider>
        <div className="h-full">
          <div className="h-[80px] md:pl-56 fixed inset-y-0 w-full z-50">
            <AdminNavbar />
          </div>
          <div className="hidden md:flex h-full w-56 flex-col fixed inset-y-0 z-50">
            <AdminSidebar />
          </div>
          <main className="md:pl-56 pt-[80px] h-full">
            {children}
          </main>
        </div>
      </CompetitionProvider>
    </DataSyncProvider>
  );
};

export default AdminLayout;