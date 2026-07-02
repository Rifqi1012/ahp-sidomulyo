import Link from "next/link";
import type { KpiType } from "@prisma/client";

import { cn } from "@/lib/utils";

export function KpiStepper({
  type,
  active,
}: {
  type: KpiType;
  active: 1 | 2;
}) {
  const steps = [
    { n: 1, label: "Struktur KPI", href: `/hrd/kpi/${type}` },
    { n: 2, label: "Perbandingan AHP", href: `/hrd/kpi/${type}/ahp` },
  ];
  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-3">
          <Link
            href={s.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
              active === s.n
                ? "bg-blue-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                active === s.n ? "bg-white text-blue-600" : "bg-slate-300 text-white",
              )}
            >
              {s.n}
            </span>
            {s.label}
          </Link>
          {i === 0 && <span className="h-px w-8 bg-slate-300" />}
        </div>
      ))}
    </div>
  );
}
