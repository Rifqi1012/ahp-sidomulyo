import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";

import {
  getMyAssessmentDetail,
  type AssessmentDetailData,
  type PdfCriteria,
} from "@/app/actions/report";
import type { AssessorBreakdown } from "@/app/actions/assessment";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/assessment/CategoryBadge";
import { ExportPdfButton } from "@/components/shared/ExportPdfButton";
import { ResultBreakdown } from "@/components/assessment/ResultBreakdown";
import { formatDate } from "@/lib/format";

// Rincian per penilai (KC 60% & KD 40%) dari data gabungan.
function toBreakdown(d: AssessmentDetailData): AssessorBreakdown[] {
  const mk = (
    p: AssessmentDetailData["penilai1"],
    pick: (s: PdfCriteria["subcriteria"][number]) => number | null,
  ): AssessorBreakdown | null => {
    if (!p) return null;
    const details = d.criteria.flatMap((c) =>
      c.subcriteria
        .filter((s) => pick(s) != null)
        .map((s) => {
          const score = pick(s)!;
          const ahpWeight = s.globalPercent / 100;
          return {
            criteriaName: c.name,
            subName: s.name,
            score,
            ahpWeight,
            weighted: score * ahpWeight,
          };
        }),
    );
    const totalScore = details.reduce((a, x) => a + x.weighted, 0);
    return {
      label: `${p.jabatanName} — ${p.name}`,
      weightPct: p.weightPct,
      submitted: p.submitted,
      totalScore,
      contribution: totalScore * (p.weightPct / 100),
      details,
    };
  };
  return [
    mk(d.penilai1, (s) => s.p1Score),
    mk(d.penilai2, (s) => s.p2Score),
  ].filter((x): x is AssessorBreakdown => x !== null);
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// Pecah deskripsi subkriteria menjadi indikator bernomor.
function indikator(desc: string): string[] {
  return desc
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function HasilPenilaianView({
  periodId,
  backHref,
}: {
  periodId: number;
  backHref: string;
}) {
  const d = await getMyAssessmentDetail(periodId);
  if (!d) notFound();
  // Hanya tampilkan hasil pada periode AKTIF.
  if (d.period.status !== "ACTIVE") redirect(backHref);

  const isAtas = d.kpiType === "atas";
  const twoPenilai = d.penilai1 != null && d.penilai2 != null;
  const year = new Date(d.period.startDate).getUTCFullYear();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Aksi */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Periode Aktif
        </span>
        {d.isComplete && (
          <ExportPdfButton
            finalScoreId={d.finalScoreId}
            assesseeName={d.assessee.name}
          />
        )}
      </div>

      {/* Header */}
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
        <div className="bg-blue-900 px-4 py-3 text-center text-white">
          <p className="text-base font-bold">PENILAIAN KINERJA KARYAWAN</p>
          <p className="text-sm">
            {isAtas
              ? `Key Performance Indicators (KPI) ${year}`
              : "PKK - 01"}
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 p-4 text-sm sm:grid-cols-2">
          <Info label="Nama Karyawan" value={d.assessee.name} />
          <Info label="Jabatan" value={d.assessee.jabatanName} />
          <Info
            label="Divisi"
            value={`${d.assessee.departmentName} — ${d.assessee.branchName}`}
          />
          <Info
            label={isAtas ? "Tgl Penilaian" : "Tgl Masuk"}
            value={
              isAtas
                ? formatDate(d.submittedAt)
                : formatDate(d.assessee.hireDate)
            }
          />
          <Info label="Periode" value={d.period.name} />
          {!isAtas && <Info label="Evaluasi" value="Tahunan" />}
          {d.penilai1 && (
            <Info
              label="Penilai 1"
              value={`${d.penilai1.name} (Bobot ${d.penilai1.weightPct}%)`}
            />
          )}
          {d.penilai2 && (
            <Info
              label={twoPenilai ? "Penilai 2" : "Penilai"}
              value={`${d.penilai2.name} (Bobot ${d.penilai2.weightPct}%)`}
            />
          )}
        </dl>
      </div>

      {/* Status belum lengkap */}
      {!d.isComplete && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-yellow-800">
            <Clock className="h-5 w-5" /> Penilaian Belum Lengkap
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {[d.penilai1, d.penilai2].map((p, i) =>
              p ? (
                <li key={i} className="flex items-center gap-2 text-slate-700">
                  {p.submitted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  )}
                  {p.name} — {p.submitted ? "Sudah menilai" : "Belum menilai"}
                </li>
              ) : null,
            )}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Nilai akhir akan dihitung setelah semua penilai menyelesaikan
            penilaian.
          </p>
        </div>
      )}

      {/* Tabel per kriteria */}
      {isAtas
        ? d.criteria.map((c, i) => (
            <AtasTable key={i} letter={LETTERS[i]} c={c} twoPenilai={twoPenilai} />
          ))
        : d.criteria.map((c, i) => (
            <BawahTable key={i} roman={ROMAN[i]} c={c} />
          ))}

      {/* Ringkasan */}
      <div className="overflow-hidden rounded-lg border border-slate-300">
        <div className="bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800">
          RINGKASAN NILAI
        </div>
        <table className="w-full text-sm">
          <tbody>
            {d.criteria.map((c, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="px-4 py-2 text-slate-700">
                  {isAtas
                    ? `Total Nilai ${LETTERS[i]} (${c.name})`
                    : `Total ${c.name}`}
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-900">
                  {isAtas
                    ? c.criteriaTotal.toFixed(2)
                    : c.contribution.toFixed(3)}
                </td>
              </tr>
            ))}
            <tr className="bg-blue-900 text-white">
              <td className="px-4 py-2.5 font-bold">NILAI AKHIR AHP</td>
              <td className="px-4 py-2.5 text-right text-lg font-bold">
                {d.finalScore.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-yellow-400 text-black">
              <td className="px-4 py-2 font-bold">KATEGORI</td>
              <td className="px-4 py-2 text-right font-bold">{d.category}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Formula (atas) */}
      {/* {isAtas && (
        <p className="text-sm italic text-slate-500">
          Nilai Akhir ={" "}
          {d.criteria
            .map((c) => `(${c.criteriaTotal.toFixed(2)} × ${Math.round(c.bobotPercent)}%)`)
            .join(" + ")}{" "}
          = {d.finalScore.toFixed(2)}
        </p>
      )} */}

      {/* Interpretasi (bawah) */}
      {/* {!isAtas && (
        <div className="rounded-lg border border-slate-300 p-4 text-sm">
          <p className="mb-2 font-semibold text-slate-800">Interpretasi Hasil</p>
          <ul className="space-y-0.5 text-slate-600">
            <li>4.5 - 5.0 : Sangat Baik</li>
            <li>3.5 - 4.4 : Baik</li>
            <li>2.5 - 3.4 : Cukup</li>
            <li>1.5 - 2.4 : Kurang</li>
            <li>1.0 - 1.4 : Sangat Kurang</li>
          </ul>
        </div>
      )} */}

      {/* Rincian per penilai (KC & KD) */}
      {/* {twoPenilai && (
        <ResultBreakdown
          breakdown={toBreakdown(d)}
          isComplete={d.isComplete}
          finalScore={d.finalScore}
        />
      )} */}

      {!d.isComplete && (
        <div className="rounded-lg bg-slate-50 px-4 py-2 text-center text-xs text-slate-500">
          Kategori: <CategoryBadge category={d.category} isComplete={d.isComplete} />
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">: {value}</dd>
    </div>
  );
}

function AtasTable({
  letter,
  c,
  twoPenilai,
}: {
  letter: string;
  c: PdfCriteria;
  twoPenilai: boolean;
}) {
  const cols = twoPenilai ? 6 : 5;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-700 text-xs text-white">
            <th className="border border-slate-300 px-2 py-1.5 text-left">Area Kinerja</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left">Indikator Kerja</th>
            <th className="border border-slate-300 px-2 py-1.5">Bobot</th>
            {twoPenilai && <th className="border border-slate-300 px-2 py-1.5">P1</th>}
            <th className="border border-slate-300 px-2 py-1.5">
              {twoPenilai ? "P2" : "Nilai Penilai"}
            </th>
            <th className="border border-slate-300 px-2 py-1.5">Nilai</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-slate-100 font-bold text-slate-800">
            <td colSpan={cols - 1} className="border border-slate-300 px-2 py-1.5">
              {letter}. {c.name.toUpperCase()}
            </td>
            <td className="border border-slate-300 px-2 py-1.5 text-center">
              {Math.round(c.bobotPercent)}%
            </td>
          </tr>
          {c.subcriteria.map((s, j) => (
            <tr key={j} className="align-top">
              <td className="border border-slate-300 px-2 py-1.5 font-bold text-slate-800">
                {s.name.toUpperCase()}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                {indikator(s.description).map((line, k) => (
                  <div key={k}>
                    {k + 1}. {line}
                  </div>
                ))}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-600">
                {Math.round(s.withinPercent)}%
              </td>
              {twoPenilai && (
                <td className="border border-slate-300 px-2 py-1.5 text-center">
                  {s.p1Score ?? "-"}
                </td>
              )}
              <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                {s.p2Score ?? "-"}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold text-blue-700">
                {s.weightedScore.toFixed(2)}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-bold">
            <td colSpan={cols - 2} className="border border-slate-300 px-2 py-1.5">
              Total Nilai {letter}
            </td>
            <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-600">
              100%
            </td>
            <td className="border border-slate-300 px-2 py-1.5 text-right font-bold text-blue-900">
              {c.criteriaTotal.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BawahTable({ roman, c }: { roman: string; c: PdfCriteria }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-700 text-xs text-white">
            <th className="border border-slate-300 px-2 py-1.5">No</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left">Nama</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left">Deskripsi</th>
            <th className="border border-slate-300 px-2 py-1.5">P1</th>
            <th className="border border-slate-300 px-2 py-1.5">P2</th>
            <th className="border border-slate-300 px-2 py-1.5">Nilai % (AHP)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-slate-200 font-bold text-slate-800">
            <td colSpan={7} className="border border-slate-300 px-2 py-1.5">
              {roman}. {c.name.toUpperCase()} ({Math.round(c.bobotPercent)}%)
            </td>
          </tr>
          {c.subcriteria.map((s, j) => (
            <tr key={j}>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">
                {j + 1}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 font-medium text-slate-800">
                {s.name}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                {s.description}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-center">
                {s.p1Score ?? "-"}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-center">
                {s.p2Score ?? "-"}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right text-blue-700">
                {s.weightedScore.toFixed(3)}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-bold">
            <td colSpan={5} className="border border-slate-300 px-2 py-1.5">
              Total {c.name}
            </td>
            <td className="border border-slate-300 px-2 py-1.5 text-right text-blue-900">
              {c.contribution.toFixed(3)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
