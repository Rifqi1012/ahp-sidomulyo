import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";

import { getMyResults } from "@/app/actions/assessment";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";

export async function HasilList({ basePath }: { basePath: string }) {
  const results = await getMyResults();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Hasil Penilaian Saya"
        description="Hasil penilaian kinerja Anda pada periode aktif."
      />

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Inbox className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            Belum ada hasil penilaian
          </p>
          <p className="text-sm text-slate-500">
            Hasil muncul saat ada periode penilaian aktif.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <Link
              key={r.periodId}
              href={`${basePath}/hasil-saya/${r.periodId}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {r.periodName}
                </p>
                <div className="mt-1">
                  {r.isComplete ? (
                    <Badge variant="green">Selesai</Badge>
                  ) : (
                    <Badge variant="yellow">Belum Lengkap</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Nilai Akhir</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {r.finalScore != null ? r.finalScore.toFixed(2) : "—"}
                    <span className="text-sm font-normal text-slate-400">
                      {" "}
                      / 5.00
                    </span>
                  </p>
                  {r.category && (
                    <p className="text-xs text-slate-500">{r.category}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
