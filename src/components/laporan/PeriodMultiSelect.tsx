"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import type { PeriodOption } from "@/app/actions/report";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PeriodMultiSelect({
  periods,
  selected,
  onChange,
}: {
  periods: PeriodOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(id: number) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }

  const selectedPeriods = periods.filter((p) => selected.includes(p.id));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm"
      >
        <span className="truncate text-slate-600">
          {selected.length === 0
            ? "Pilih periode"
            : `${selected.length} periode dipilih`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-md">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-slate-400">Pilih periode</span>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Hapus semua
                </button>
              )}
            </div>
            {periods.map((p) => {
              const active = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span className="text-slate-700">{p.name}</span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      active ? "text-blue-500" : "text-transparent",
                    )}
                  />
                </button>
              );
            })}
            {periods.length === 0 && (
              <p className="px-2 py-2 text-sm text-slate-400">
                Belum ada periode.
              </p>
            )}
          </div>
        </>
      )}

      {selectedPeriods.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedPeriods.map((p) => (
            <Badge key={p.id} variant="blue" className="gap-1">
              {p.name}
              <button type="button" onClick={() => toggle(p.id)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
