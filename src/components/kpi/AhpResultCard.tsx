"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export type AhpResult = {
  weights: { id: number; name: string; weight: number }[];
  lambdaMax: number;
  ci: number;
  cr: number;
  isConsistent: boolean;
};

export function AhpResultCard({
  result,
  saved,
  onSave,
  onRevise,
  loading,
}: {
  result: AhpResult;
  saved: boolean;
  onSave: () => void;
  onRevise: () => void;
  loading?: boolean;
}) {
  if (result.isConsistent) {
    return (
      <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
          <CheckCircle2 className="h-5 w-5" /> Matriks Konsisten
        </p>
        <div className="overflow-hidden rounded-lg border border-green-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              {result.weights.map((w) => (
                <tr key={w.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 text-slate-800">{w.name}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {w.weight.toFixed(4)} ({(w.weight * 100).toFixed(0)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <span>λmax: {result.lambdaMax.toFixed(3)}</span>
          <span>CI: {result.ci.toFixed(3)}</span>
          <span className="font-medium text-green-700">
            CR: {result.cr.toFixed(3)} (Batas: ≤ 0.100)
          </span>
        </div>
        <Button onClick={onSave} disabled={loading || saved}>
          <CheckCircle2 className="h-4 w-4" />
          {saved ? "Bobot Tersimpan" : "Simpan Bobot Ini"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <XCircle className="h-5 w-5" /> Matriks Tidak Konsisten
      </p>
      <p className="text-sm font-medium text-red-700">
        CR: {result.cr.toFixed(3)} (Batas: ≤ 0.100)
      </p>
      <p className="text-sm text-slate-600">
        Perbandingan Anda tidak konsisten. Periksa kembali nilai perbandingan dan
        pastikan penilaian logis (jika A &gt; B dan B &gt; C, maka A harus lebih
        penting dari C).
      </p>
      <Button variant="outline" onClick={onRevise} disabled={loading}>
        Revisi Perbandingan
      </Button>
    </div>
  );
}
