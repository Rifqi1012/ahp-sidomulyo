"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Eye } from "lucide-react";

import type { AssessmentResult, ReportByPeriod } from "@/app/actions/report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/assessment/CategoryBadge";
import { ExportPdfButton } from "@/components/shared/ExportPdfButton";
import { cn } from "@/lib/utils";

type Branch = ReportByPeriod["byBranch"][number];
type TabKey = "kepalaCabang" | "kepalaDivisi" | "karyawan";

const TABS: { key: TabKey; label: string }[] = [
  { key: "kepalaCabang", label: "Kepala Cabang" },
  { key: "kepalaDivisi", label: "Kepala Divisi" },
  { key: "karyawan", label: "Karyawan" },
];

function ResultTable({
  rows,
  basePath,
}: {
  rows: AssessmentResult[];
  basePath: string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-400">Tidak ada data.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Nama</th>
            <th className="px-4 py-2 text-left font-medium">Jabatan</th>
            <th className="px-4 py-2 text-right font-medium">Nilai Akhir</th>
            <th className="px-4 py-2 text-left font-medium">Kategori</th>
            <th className="px-4 py-2 text-right font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.finalScoreId} className="border-t border-slate-100">
              <td className="px-4 py-2 font-medium text-slate-900">{r.name}</td>
              <td className="px-4 py-2 text-slate-600">{r.jabatanName}</td>
              <td className="px-4 py-2 text-right text-slate-700">
                {r.finalScore != null ? r.finalScore.toFixed(2) : "—"}
              </td>
              <td className="px-4 py-2">
                <CategoryBadge category={r.category} isComplete={r.isComplete} />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`${basePath}/laporan/${r.finalScoreId}`}>
                      <Eye className="h-4 w-4" />
                      Detail
                    </Link>
                  </Button>
                  {r.isComplete && (
                    <ExportPdfButton
                      finalScoreId={r.finalScoreId}
                      assesseeName={r.name}
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BranchCard({ branch, basePath }: { branch: Branch; basePath: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("kepalaCabang");

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">{branch.branchName}</span>
          <Badge variant="slate">{branch.count} orang</Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            Rata-rata:{" "}
            <span className="font-medium text-slate-900">
              {branch.avgScore.toFixed(2)}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-slate-400 transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          <div className="flex gap-1 border-b border-slate-100 px-4 pt-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                {t.label}{" "}
                <span className="text-xs text-slate-400">
                  ({branch[t.key].length})
                </span>
              </button>
            ))}
          </div>
          <ResultTable rows={branch[tab]} basePath={basePath} />
        </div>
      )}
    </div>
  );
}

export function BranchAccordion({
  byBranch,
  basePath,
}: {
  byBranch: Branch[];
  basePath: string;
}) {
  return (
    <div className="space-y-3">
      {byBranch.map((b, i) => (
        <BranchCard key={i} branch={b} basePath={basePath} />
      ))}
    </div>
  );
}
