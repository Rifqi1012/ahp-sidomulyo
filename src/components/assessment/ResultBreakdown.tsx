"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssessorBreakdown } from "@/app/actions/assessment";

function BreakdownCard({ row }: { row: AssessorBreakdown }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          {row.submitted ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Clock className="h-4 w-4 text-yellow-500" />
          )}
          <span className="text-sm font-medium text-slate-900">
            {row.label}
          </span>
          <Badge variant="slate">Bobot {row.weightPct}%</Badge>
        </div>
        {row.submitted ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">
              Skor:{" "}
              <span className="font-medium text-slate-900">
                {row.totalScore?.toFixed(2)}
              </span>
            </span>
            <span className="text-slate-600">
              Kontribusi:{" "}
              <span className="font-medium text-slate-900">
                {row.contribution?.toFixed(2)}
              </span>
            </span>
          </div>
        ) : (
          <Badge variant="yellow">Belum dinilai</Badge>
        )}
      </div>

      {row.submitted && row.details.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-2.5 text-sm text-slate-600"
          >
            Rincian subkriteria
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
          {open && (
            <div className="overflow-x-auto px-5 pb-4">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 text-left font-medium">Kriteria</th>
                    <th className="py-2 text-left font-medium">Subkriteria</th>
                    <th className="py-2 text-right font-medium">Nilai</th>
                    <th className="py-2 text-right font-medium">Bobot</th>
                    <th className="py-2 text-right font-medium">Tertimbang</th>
                  </tr>
                </thead>
                <tbody>
                  {row.details.map((d, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 text-slate-500">{d.criteriaName}</td>
                      <td className="py-2 text-slate-800">{d.subName}</td>
                      <td className="py-2 text-right text-slate-700">
                        {d.score}
                      </td>
                      <td className="py-2 text-right text-slate-500">
                        {d.ahpWeight.toFixed(4)}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {d.weighted.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ResultBreakdown({
  breakdown,
  isComplete,
  finalScore,
}: {
  breakdown: AssessorBreakdown[];
  isComplete: boolean;
  finalScore: number | null;
}) {
  const contributions = breakdown
    .filter((b) => b.submitted)
    .map((b) => b.contribution ?? 0);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Rincian Per Penilai</h2>
      {breakdown.map((row, i) => (
        <BreakdownCard key={i} row={row} />
      ))}

      {isComplete && finalScore != null && contributions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm">
          <span className="text-slate-600">Total: </span>
          <span className="font-medium text-slate-900">
            {contributions.map((c) => c.toFixed(2)).join(" + ")} ={" "}
            {finalScore.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
