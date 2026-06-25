import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

import { getMyResultDetail } from "@/app/actions/assessment";
import { PageHeader } from "@/components/shared/PageHeader";
import { ResultBreakdown } from "@/components/assessment/ResultBreakdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function HasilDetail({
  periodId,
  basePath,
}: {
  periodId: number;
  basePath: string;
}) {
  const detail = await getMyResultDetail(periodId);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Hasil Penilaian"
        description={`${detail.assessee.name} — Periode ${detail.periodName}`}
        action={
          <Button variant="outline" asChild>
            <Link href={`${basePath}/hasil-saya`}>
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      {/* Identitas */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {detail.assessee.name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {detail.assessee.jabatanName} · {detail.assessee.departmentName} ·{" "}
          {detail.assessee.branchName}
        </p>
      </div>

      {/* Nilai akhir / status */}
      {detail.isComplete && detail.finalScore != null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">Nilai Akhir AHP</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              {detail.finalScore.toFixed(2)}
              <span className="text-base font-normal text-slate-400"> / 5.00</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">Kategori Kinerja</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {detail.category}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
            <Clock className="h-5 w-5" />
            Penilaian Belum Lengkap
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {detail.breakdown.map((b, i) => (
              <li key={i} className="flex items-center gap-2">
                {b.submitted ? (
                  <Badge variant="green">Sudah dinilai</Badge>
                ) : (
                  <Badge variant="yellow">Belum dinilai</Badge>
                )}
                <span className="text-slate-700">
                  {b.label}
                  {b.submitted && b.totalScore != null
                    ? ` (${b.totalScore.toFixed(2)})`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ResultBreakdown
        breakdown={detail.breakdown}
        isComplete={detail.isComplete}
        finalScore={detail.finalScore}
      />
    </div>
  );
}
