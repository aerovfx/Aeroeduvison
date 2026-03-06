import { Shield } from "lucide-react";

export const AdminLogo = () => {
  return (
    <div className="flex items-center gap-x-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-lg">
        <Shield className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-xl font-semibold">inPhysic</p>
        <p className="text-xs text-muted-foreground">Admin Panel</p>
      </div>
    </div>
  );
};














