import { BarChart3 } from "lucide-react";

import { getReportByPeriod, getReportPeriods } from "@/app/actions/report";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodSelect } from "@/components/report/PeriodSelect";
import { BranchAccordion } from "@/components/report/BranchAccordion";
import { ExportAllButton } from "@/components/report/ExportAllButton";

const DIST_ROWS = [
  { key: "sangatBaik", label: "Sangat Baik", range: "4.5-5.0", color: "bg-green-500" },
  { key: "baik", label: "Baik", range: "3.5-4.4", color: "bg-blue-500" },
  { key: "cukup", label: "Cukup", range: "2.5-3.4", color: "bg-yellow-500" },
  { key: "kurang", label: "Kurang", range: "1.5-2.4", color: "bg-orange-500" },
  { key: "sangatKurang", label: "Sangat Kurang", range: "1.0-1.4", color: "bg-red-500" },
] as const;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export async function LaporanView({
  basePath,
  periodId,
}: {
  basePath: string;
  periodId?: number;
}) {
  const periods = await getReportPeriods();
  const report = periodId ? await getReportByPeriod(periodId) : null;

  const allFinalScoreIds = report
    ? report.byBranch.flatMap((b) =>
        [...b.kepalaCabang, ...b.kepalaDivisi, ...b.karyawan]
          .filter((r) => r.isComplete)
          .map((r) => r.finalScoreId),
      )
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Laporan Kinerja"
        description="Rekap hasil penilaian kinerja per periode."
        action={<PeriodSelect periods={periods} current={periodId} />}
      />

      {!report ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <BarChart3 className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            Pilih periode untuk melihat laporan
          </p>
        </div>
      ) : (
        <>
          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Dinilai" value={String(report.summary.totalAssessed)} />
            <StatCard label="Rata-rata Nilai" value={report.summary.avgScore.toFixed(2)} />
            <StatCard label="Tertinggi" value={report.summary.highest.toFixed(2)} />
            <StatCard label="Terendah" value={report.summary.lowest.toFixed(2)} />
          </div>

          {/* Distribusi */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Distribusi Nilai</h2>
            <div className="mt-4 space-y-3">
              {DIST_ROWS.map((row) => {
                const count = report.summary.distribution[row.key];
                const total = report.summary.totalAssessed || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={row.key} className="flex items-center gap-3 text-sm">
                    <div className="w-40 shrink-0 text-slate-600">
                      {row.label}{" "}
                      <span className="text-xs text-slate-400">({row.range})</span>
                    </div>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${row.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right text-slate-700">
                      {count} orang ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per cabang + export semua */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Per Cabang</h2>
            <ExportAllButton finalScoreIds={allFinalScoreIds} />
          </div>
          <BranchAccordion byBranch={report.byBranch} basePath={basePath} />
        </>
      )}
    </div>
  );
}
