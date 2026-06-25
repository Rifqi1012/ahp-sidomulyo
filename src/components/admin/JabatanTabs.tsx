"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type JabatanTabsProps = {
  active: "pusat" | "cabang";
};

const TABS: { value: "pusat" | "cabang"; label: string }[] = [
  { value: "pusat", label: "Jabatan Pusat" },
  { value: "cabang", label: "Jabatan Cabang" },
];

export function JabatanTabs({ active }: JabatanTabsProps) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={`/admin/jabatan?scope=${tab.value}`}
          className={cn(
            "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            active === tab.value
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
