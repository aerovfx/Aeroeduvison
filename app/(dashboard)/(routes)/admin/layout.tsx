"use client"

import { DataSyncProvider } from "@/contexts/DataSyncContext";

export default function AdminRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataSyncProvider>
      {children}
    </DataSyncProvider>
  );
}
