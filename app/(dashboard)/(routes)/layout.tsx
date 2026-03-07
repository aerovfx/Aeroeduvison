"use client"

import { XPProvider } from "@/contexts/XPContext";
import { CompetitionProvider } from "@/contexts/CompetitionContext";
import { STEMProvider } from "@/contexts/STEMContext";

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <XPProvider>
      <CompetitionProvider>
        <STEMProvider>
          {children}
        </STEMProvider>
      </CompetitionProvider>
    </XPProvider>
  );
}
