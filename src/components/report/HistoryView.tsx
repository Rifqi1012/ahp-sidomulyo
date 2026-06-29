import Link from "next/link";
import { Eye, Inbox } from "lucide-react";

import {
  getHistory,
  getReportBranches,
  getReportPeriods,
  type HistoryFilter,
} from "@/app/actions/report";
import { PageHeader } from "@/components/shared/PageHeader";
import { HistoryFilters } from "@/components/report/HistoryFilters";
import { CategoryBadge } from "@/components/assessment/CategoryBadge";
import { ExportPdfButton } from "@/components/shared/ExportPdfButton";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";

type SearchParams = {
  periodId?: string;
  branchId?: string;
  level?: string;
  search?: string;
  page?: string;
};

function num(v?: string) {
  const n = v ? Number(v) : undefined;
  return n && !Number.isNaN(n) ? n : undefined;
}

export async function HistoryView({
  basePath,
  searchParams,
  scoped = false,
}: {
  basePath: string;
  searchParams: SearchParams;
  scoped?: boolean;
}) {
  const filter: HistoryFilter = {
    periodId: num(searchParams.periodId),
    branchId: num(searchParams.branchId),
    jabatanLevel:
      searchParams.level === "atas"
        ? "atas"
        : searchParams.level === "bawah"
          ? "bawah"
          : undefined,
    search: searchParams.search,
    page: num(searchParams.page) ?? 1,
  };

  const [result, periods, branches] = await Promise.all([
    getHistory(filter),
    getReportPeriods(),
    getReportBranches(),
  ]);

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <PageHeader
        title="History Penilaian"
        description="Riwayat hasil penilaian kinerja karyawan."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <HistoryFilters
          periods={periods}
          branches={branches}
          showPeriodBranch={!scoped}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Nama</th>
                <th className="px-4 py-2.5 text-left font-medium">Jabatan</th>
                <th className="px-4 py-2.5 text-left font-medium">Cabang</th>
                <th className="px-4 py-2.5 text-left font-medium">Periode</th>
                {/* <th className="px-4 py-2.5 text-left font-medium">Penilai 1</th>
                <th className="px-4 py-2.5 text-right font-medium">Nilai P1</th>
                <th className="px-4 py-2.5 text-left font-medium">Penilai 2</th>
                <th className="px-4 py-2.5 text-right font-medium">Nilai P2</th> */}
                <th className="px-4 py-2.5 text-right font-medium">Akhir</th>
                <th className="px-4 py-2.5 text-left font-medium">Kategori</th>
                <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="h-8 w-8 text-slate-300" />
                      Tidak ada data penilaian.
                    </div>
                  </td>
                </tr>
              ) : (
                result.rows.map((r) => (
                  <tr key={r.finalScoreId} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.jabatanName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.branchName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.periodName}</td>
                    {/* <td className="px-4 py-2.5 text-slate-600">{r.penilai1Name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {r.penilai1Score != null ? r.penilai1Score.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.penilai2Name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {r.penilai2Score != null ? r.penilai2Score.toFixed(2) : "—"}
                    </td> */}
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                      {r.finalScore != null ? r.finalScore.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <CategoryBadge category={r.category} isComplete={r.isComplete} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
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
                            variant="ghost"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200">
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
          />
        </div>
      </div>
    </div>
  );
}
