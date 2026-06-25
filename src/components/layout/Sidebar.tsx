"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getNavItems, ROLE_LABELS } from "@/lib/navigation";

export type SidebarUser = {
  name: string;
  role: string;
};

type SidebarProps = {
  user: SidebarUser;
  open: boolean;
  onClose: () => void;
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(user.role);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0F172A] transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="text-sm font-medium text-white">
              PT Sidomulyo Selaras
            </p>
            <p className="text-xs text-slate-400">Sistem Penilaian Kinerja</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigasi */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-transparent text-slate-300 hover:bg-white/5",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
