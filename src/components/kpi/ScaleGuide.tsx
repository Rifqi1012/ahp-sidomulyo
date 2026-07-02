"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const ROWS = [
  [1, "Sama penting"],
  [2, "Nilai antara"],
  [3, "Sedikit lebih penting"],
  [4, "Nilai antara"],
  [5, "Lebih penting"],
  [6, "Nilai antara"],
  [7, "Sangat penting"],
  [8, "Nilai antara"],
  [9, "Mutlak lebih penting"],
] as const;

export function ScaleGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-slate-800"
      >
        Panduan Pengisian
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm">
          <table className="text-sm">
            <tbody>
              {ROWS.map(([n, label]) => (
                <tr key={n}>
                  <td className="py-1 pr-4 font-medium text-slate-700">{n}</td>
                  <td className="py-1 text-slate-600">{label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            Pilih nilai di sisi KIRI jika variabel kiri lebih penting, sisi KANAN
            jika variabel kanan lebih penting.
          </p>
        </div>
      )}
    </div>
  );
}
