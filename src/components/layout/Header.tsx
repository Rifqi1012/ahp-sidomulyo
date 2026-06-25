"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { getPageTitle, ROLE_LABELS } from "@/lib/navigation";

export type HeaderUser = {
  name: string;
  role: string;
};

type HeaderProps = {
  user: HeaderUser;
  onMenuClick: () => void;
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(user.role, pathname);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="text-slate-600 hover:text-slate-900 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
          <span className="text-xs text-slate-500">{roleLabel}</span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
          {getInitials(user.name)}
        </div>
      </div>
    </header>
  );
}
