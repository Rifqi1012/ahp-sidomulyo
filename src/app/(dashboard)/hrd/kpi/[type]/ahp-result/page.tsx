import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import type { KpiType } from "@prisma/client";

import { getAhpResult } from "@/app/actions/kpi";
import { PrintButton } from "@/components/forms/PrintButton";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function abbrev(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 3) || name.slice(0, 3).toUpperCase();
}

export default async function AhpResultPage({
  params,
}: {
  params: { type: string };
}) {
  if (params.type !== "atas" && params.type !== "bawah") notFound();
  const type = params.type as KpiType;

  const result = await getAhpResult(type);
  if (!result) notFound();

  const totalOk = Math.abs(result.globalTotal - 1) <= 0.001;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Hasil Perhitungan AHP — KPI {type === "atas" ? "Atas" : "Bawah"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Versi {result.version} — {formatDate(result.createdAt)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Halaman ini menampilkan detail perhitungan AHP untuk keperluan
            verifikasi dan dokumentasi.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" asChild>
            <Link href={`/hrd/kpi/${type}`}>
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Setup KPI
            </Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Per kriteria */}
      {result.criteria.map((c, idx) => {
        const labels = c.subNames.map(abbrev);
        const consistent = c.cr <= 0.1;
        return (
          <div
            key={idx}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-900">
              {LETTERS[idx]}. {c.name}
            </h2>

            {/* Matriks */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Matriks Perbandingan Berpasangan
              </p>
              {c.matrix.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-1.5" />
                        {labels.map((l, j) => (
                          <th
                            key={j}
                            className="px-3 py-1.5 text-center font-medium text-slate-500"
                          >
                            {l}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.matrix.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-medium text-slate-500">
                            {labels[i]}
                          </td>
                          {row.map((val, j) => (
                            <td
                              key={j}
                              className="px-3 py-1.5 text-center text-slate-700"
                            >
                              {val.toFixed(3)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Belum ada subkriteria.</p>
              )}
            </div>

            {/* Priority vector */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Priority Vector (Bobot AHP)
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">
                        Subkriteria
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">
                        Bobot AHP
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.weights.map((w, j) => (
                      <tr key={j} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-800">{w.name}</td>
                        <td className="px-4 py-2 text-right text-slate-700">
                          {w.ahpWeight.toFixed(4)} ({(w.ahpWeight * 100).toFixed(0)}
                          %)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Konsistensi */}
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
              <span className="text-slate-600">
                λmax : <span className="font-medium text-slate-900">{c.lambdaMax.toFixed(3)}</span>
              </span>
              <span className="text-slate-600">
                CI : <span className="font-medium text-slate-900">{c.ci.toFixed(3)}</span>
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  consistent ? "text-green-700" : "text-red-700",
                )}
              >
                CR : {c.cr.toFixed(3)}
                {consistent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Konsisten
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" /> Tidak Konsisten
                  </>
                )}
              </span>
            </div>
          </div>
        );
      })}

      {/* Bobot global */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Bobot Global Subkriteria
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Digunakan dalam perhitungan nilai akhir.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">
                  Subkriteria
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">
                  Bobot Global
                </th>
              </tr>
            </thead>
            <tbody>
              {result.global.map((g, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-800">{g.name}</td>
                  <td className="px-4 py-2 text-right text-slate-700">
                    {g.globalWeight.toFixed(4)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-2 text-slate-900">TOTAL</td>
                <td className="px-4 py-2 text-right text-slate-900">
                  <span className="inline-flex items-center gap-1">
                    {result.globalTotal.toFixed(4)}
                    {totalOk && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
