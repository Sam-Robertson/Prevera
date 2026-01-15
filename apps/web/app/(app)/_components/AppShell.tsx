import type { ReactNode } from "react";
import AppHeader from "@/components/AppHeader";
import SessionGuard from "./SessionGuard";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SessionGuard />
      <AppHeader />
      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  );
}
