import AppShell from "./_components/AppShell";
import type { ReactNode } from "react";

export default function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
