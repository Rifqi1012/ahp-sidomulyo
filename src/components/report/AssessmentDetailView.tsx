import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getAssessmentDetail } from "@/app/actions/report";
import { PageHeader } from "@/components/shared/PageHeader";
import { CategoryBadge } from "@/components/assessment/CategoryBadge";
import { ExportPdfButton } from "@/components/shared/ExportPdfButton";
import { Button } from "@/components/ui/button";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function AssessmentDetailView({
  finalScoreId,
  basePath,
}: {
  finalScoreId: number;
  basePath: string;
}) {
  const d = await getAssessmentDetail(finalScoreId);
  if (!d) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Detail Hasil Penilaian"
        description={`${d.assessee.name} — Periode ${d.period.name}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`${basePath}/laporan`}>
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            {d.isComplete && (
              <ExportPdfButton
                finalScoreId={finalScoreId}
                assesseeName={d.assessee.name}
                variant="default"
              />
            )}
          </div>
        }
      />

      {/* Identitas + nilai */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-1">
          <h1 className="text-base font-semibold text-slate-900">
            {d.assessee.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.assessee.jabatanName}
          </p>
          <p className="text-sm text-slate-500">
            {d.assessee.departmentName} · {d.assessee.branchName}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Nilai Akhir</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {d.finalScore.toFixed(2)}
            <span className="text-base font-normal text-slate-400"> / 5.00</span>
          </p>
        </div>
        <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-slate-500">Kategori</p>
          <div className="mt-2">
            <CategoryBadge category={d.category} isComplete={d.isComplete} />
          </div>
        </div>
      </div>

      {/* Penilai */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[d.penilai1, d.penilai2].map((p, i) =>
          p ? (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
            >
              <p className="font-medium text-slate-900">
                Penilai {i + 1} · Bobot {p.weightPct}%
              </p>
              <p className="text-slate-500">
                {p.name} ({p.jabatanName})
              </p>
            </div>
          ) : null,
        )}
      </div>

      {/* Per kriteria */}
      {d.criteria.map((c, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {LETTERS[i]}. {c.name}
            </h2>
            <span className="text-sm text-slate-500">
              Total: <span className="font-medium text-slate-900">
                {c.criteriaTotal.toFixed(2)}
              </span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Subkriteria</th>
                  {d.penilai1 && (
                    <th className="px-3 py-2 text-center font-medium">P1</th>
                  )}
                  <th className="px-3 py-2 text-center font-medium">
                    {d.penilai1 ? "P2" : "Nilai"}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">Gabungan</th>
                  <th className="px-3 py-2 text-right font-medium">Bobot Global</th>
                  <th className="px-3 py-2 text-right font-medium">Tertimbang</th>
                </tr>
              </thead>
              <tbody>
                {c.subcriteria.map((s, j) => (
                  <tr key={j} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-800">{s.name}</td>
                    {d.penilai1 && (
                      <td className="px-3 py-2 text-center text-slate-600">
                        {s.p1Score ?? "-"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-center text-slate-600">
                      {s.p2Score ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-700">
                      {s.blended.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {s.globalPercent.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-900">
                      {s.weightedScore.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
