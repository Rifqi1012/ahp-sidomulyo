"use client";

import { useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export type ShellUser = {
  name: string;
  role: string;
};

type DashboardShellProps = {
  user: ShellUser;
  children: React.ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Konten — diberi offset selebar sidebar di desktop */}
      <div className="lg:pl-[260px]">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
