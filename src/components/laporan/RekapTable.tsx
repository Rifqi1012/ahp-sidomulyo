"use client";

import Link from "next/link";
import { Eye, Inbox } from "lucide-react";

import type { PeriodOption, RekapRow } from "@/app/actions/report";
import { Button } from "@/components/ui/button";
import { ExportPdfButton } from "@/components/shared/ExportPdfButton";
import { cn } from "@/lib/utils";

function periodCriteria(data: RekapRow[], periodId: number): string[] {
  let best: string[] = [];
  for (const row of data) {
    const ps = row.periodeScores.find((p) => p.periodId === periodId);
    if (ps && ps.kriteriaScores.length > best.length) {
      best = ps.kriteriaScores.map((k) => k.criteriaName);
    }
  }
  return best;
}

export function RekapTable({
  data,
  periods,
  basePath,
  selected,
  onToggle,
  onToggleAll,
}: {
  data: RekapRow[];
  periods: PeriodOption[];
  basePath: string;
  selected: Set<number>;
  onToggle: (userId: number) => void;
  onToggleAll: () => void;
}) {
  const critByPeriod = new Map(
    periods.map((p) => [p.id, periodCriteria(data, p.id)]),
  );
  const allSelected = data.length > 0 && data.every((r) => selected.has(r.userId));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#1e3a5f] text-white">
            <th rowSpan={2} className="border border-slate-300 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 accent-blue-500"
              />
            </th>
            <th rowSpan={2} className="border border-slate-300 px-3 py-2 text-left">
              No
            </th>
            <th rowSpan={2} className="border border-slate-300 px-3 py-2 text-left">
              Nama
            </th>
            <th rowSpan={2} className="border border-slate-300 px-3 py-2 text-left">
              Jabatan
            </th>
            {periods.map((p) => (
              <th
                key={p.id}
                colSpan={(critByPeriod.get(p.id)?.length ?? 0) + 1}
                className="border border-slate-300 px-3 py-2 text-center"
              >
                {p.name}
              </th>
            ))}
            <th rowSpan={2} className="border border-slate-300 px-3 py-2 text-right">
              Aksi
            </th>
          </tr>
          <tr className="bg-[#1e3a5f] text-xs text-white">
            {periods.map((p) => {
              const crits = critByPeriod.get(p.id) ?? [];
              return [
                ...crits.map((c) => (
                  <th
                    key={`${p.id}-${c}`}
                    className="border border-slate-300 px-2 py-1.5 text-center font-medium"
                  >
                    {c}
                  </th>
                )),
                <th
                  key={`${p.id}-akhir`}
                  className="border border-slate-300 bg-[#16304d] px-2 py-1.5 text-center font-semibold"
                >
                  NILAI AKHIR
                </th>,
              ];
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={
                  4 +
                  periods.reduce(
                    (s, p) => s + (critByPeriod.get(p.id)?.length ?? 0) + 1,
                    0,
                  ) +
                  1
                }
                className="py-12 text-center text-sm text-slate-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <Inbox className="h-8 w-8 text-slate-300" />
                  {periods.length === 0
                    ? "Pilih minimal satu periode."
                    : "Tidak ada data."}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              // Periode terbaru yang punya hasil → untuk Detail/PDF.
              const rep = [...row.periodeScores]
                .reverse()
                .find((p) => p.finalScoreId != null);
              return (
                <tr
                  key={row.userId}
                  className={cn(idx % 2 === 1 && "bg-slate-50")}
                >
                  <td className="border border-slate-200 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(row.userId)}
                      onChange={() => onToggle(row.userId)}
                      className="h-4 w-4 accent-blue-500"
                    />
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900">
                    {row.name}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-600">
                    {row.jabatan}
                  </td>
                  {periods.map((p) => {
                    const crits = critByPeriod.get(p.id) ?? [];
                    const ps = row.periodeScores.find((x) => x.periodId === p.id);
                    return [
                      ...crits.map((c) => {
                        const cs = ps?.kriteriaScores.find(
                          (k) => k.criteriaName === c,
                        );
                        return (
                          <td
                            key={`${p.id}-${c}`}
                            className="border border-slate-200 px-2 py-2 text-center text-slate-700"
                          >
                            {cs ? cs.totalScore.toFixed(3) : "—"}
                          </td>
                        );
                      }),
                      <td
                        key={`${p.id}-akhir`}
                        className="border border-slate-200 bg-[#FFD700]/40 px-2 py-2 text-center font-bold text-slate-900"
                      >
                        {ps?.finalScore != null
                          ? ps.finalScore.toFixed(2)
                          : "—"}
                      </td>,
                    ];
                  })}
                  <td className="border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {rep ? (
                        <>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`${basePath}/laporan/${rep.finalScoreId}`}>
                              <Eye className="h-4 w-4" />
                              Detail
                            </Link>
                          </Button>
                          <ExportPdfButton
                            finalScoreId={rep.finalScoreId!}
                            assesseeName={row.name}
                            variant="ghost"
                          />
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
