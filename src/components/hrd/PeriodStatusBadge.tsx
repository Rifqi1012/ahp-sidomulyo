import type { PeriodStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

const CONFIG: Record<PeriodStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  ACTIVE: {
    label: "Aktif",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  CLOSED: { label: "Selesai", className: "bg-blue-50 text-blue-700" },
};

type PeriodStatusBadgeProps = {
  status: PeriodStatus;
  size?: "sm" | "lg";
};

export function PeriodStatusBadge({
  status,
  size = "sm",
}: PeriodStatusBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs",
        cfg.className,
      )}
    >
      {status === "ACTIVE" && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}
