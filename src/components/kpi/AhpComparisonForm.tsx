"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import type { KpiType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ScaleGuide } from "@/components/kpi/ScaleGuide";
import { ComparisonRow } from "@/components/kpi/ComparisonRow";
import { AhpResultCard, type AhpResult } from "@/components/kpi/AhpResultCard";
import { KpiStepper } from "@/components/kpi/KpiStepper";
import { calculateAhpFromMatrix } from "@/lib/ahp";
import { saveComparisons, saveAllAndCreateVersion } from "@/app/actions/kpi";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

type Sub = { id: number; name: string };
type Crit = {
  id: number;
  name: string;
  subcriteria: Sub[];
  comparisons: { subIId: number; subJId: number; value: number }[];
  status: "empty" | "inconsistent" | "consistent";
};

function genPairs(subs: Sub[]) {
  const pairs: { iId: number; jId: number; iName: string; jName: string }[] = [];
  for (let a = 0; a < subs.length; a++)
    for (let b = a + 1; b < subs.length; b++)
      pairs.push({
        iId: subs[a].id,
        jId: subs[b].id,
        iName: subs[a].name,
        jName: subs[b].name,
      });
  return pairs;
}

function buildMatrix(subIds: number[], values: Map<string, number>) {
  const n = subIds.length;
  const idx = new Map(subIds.map((id, i) => [id, i]));
  const m = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j): number => (i === j ? 1 : 0)),
  );
  for (const [key, v] of Array.from(values.entries())) {
    const [iId, jId] = key.split("-").map(Number);
    const i = idx.get(iId);
    const j = idx.get(jId);
    if (i == null || j == null) continue;
    m[i][j] = v;
    m[j][i] = v !== 0 ? 1 / v : 0;
  }
  return m;
}

export function AhpComparisonForm({
  type,
  criteria,
}: {
  type: KpiType;
  criteria: Crit[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // value per pasangan, key `${iId}-${jId}`.
  const initial = useMemo(() => {
    const map: Record<number, Map<string, number>> = {};
    for (const c of criteria) {
      const m = new Map<string, number>();
      for (const cmp of c.comparisons) m.set(`${cmp.subIId}-${cmp.subJId}`, cmp.value);
      map[c.id] = m;
    }
    return map;
  }, [criteria]);

  const [values, setValues] = useState(initial);
  const [results, setResults] = useState<Record<number, AhpResult | null>>({});
  const [savedOk, setSavedOk] = useState<Record<number, boolean>>(() => {
    const s: Record<number, boolean> = {};
    for (const c of criteria)
      s[c.id] = c.subcriteria.length < 2 || c.status === "consistent";
    return s;
  });
  const [confirmAll, setConfirmAll] = useState(false);

  function setPair(critId: number, key: string, v: number) {
    setValues((prev) => {
      const m = new Map(prev[critId]);
      m.set(key, v);
      return { ...prev, [critId]: m };
    });
    setResults((r) => ({ ...r, [critId]: null }));
    setSavedOk((s) => ({ ...s, [critId]: false }));
  }

  function compute(c: Crit) {
    const pairs = genPairs(c.subcriteria);
    const map = values[c.id] ?? new Map();
    if (pairs.some((p) => !map.has(`${p.iId}-${p.jId}`))) {
      toast.error("Lengkapi semua perbandingan terlebih dahulu.");
      return;
    }
    const r = calculateAhpFromMatrix(
      buildMatrix(
        c.subcriteria.map((s) => s.id),
        map,
      ),
    );
    setResults((prev) => ({
      ...prev,
      [c.id]: {
        weights: c.subcriteria.map((s, i) => ({
          id: s.id,
          name: s.name,
          weight: r.weights[i] ?? 0,
        })),
        lambdaMax: r.lambdaMax,
        ci: r.ci,
        cr: r.cr,
        isConsistent: r.isConsistent,
      },
    }));
  }

  function saveBobot(c: Crit) {
    const map = values[c.id] ?? new Map();
    const comps = genPairs(c.subcriteria).map((p) => ({
      subIId: p.iId,
      subJId: p.jId,
      value: map.get(`${p.iId}-${p.jId}`)!,
    }));
    startTransition(async () => {
      const r = await saveComparisons(c.id, comps);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.result.isConsistent) {
        toast.success(`Bobot ${c.name} disimpan.`);
        setSavedOk((s) => ({ ...s, [c.id]: true }));
        router.refresh();
      } else {
        toast.error("Matriks tidak konsisten — bobot tidak disimpan.");
      }
    });
  }

  function saveAll() {
    startTransition(async () => {
      const r = await saveAllAndCreateVersion(type);
      if (r.success) {
        toast.success(`Bobot AHP berhasil disimpan (Versi ${r.newVersion}).`);
        router.push(`/hrd/kpi/${type}`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const allOk = criteria.every((c) => savedOk[c.id]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Perbandingan Berpasangan AHP
        </h1>
        <Button variant="outline" asChild>
          <Link href={`/hrd/kpi/${type}`}>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Struktur KPI
          </Link>
        </Button>
      </div>

      <KpiStepper type={type} active={2} />
      <ScaleGuide />

      {criteria.map((c, ci) => {
        const pairs = genPairs(c.subcriteria);
        const map = values[c.id] ?? new Map();
        const result = results[c.id];
        return (
          <div
            key={c.id}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {ROMAN[ci]}. {c.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {c.subcriteria.length} subkriteria → {pairs.length} pasangan
                </p>
              </div>
              {savedOk[c.id] ? (
                <Badge variant="green">✅ Konsisten</Badge>
              ) : (
                <Badge variant="slate">Belum diisi</Badge>
              )}
            </div>

            {c.subcriteria.length < 2 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Hanya 1 subkriteria — bobot otomatis 1.0, tidak perlu perbandingan.
              </p>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {pairs.map((p) => (
                    <ComparisonRow
                      key={`${p.iId}-${p.jId}`}
                      leftName={p.iName}
                      rightName={p.jName}
                      value={map.get(`${p.iId}-${p.jId}`) ?? null}
                      onChange={(v) => setPair(c.id, `${p.iId}-${p.jId}`, v)}
                      disabled={isPending}
                    />
                  ))}
                </div>
                <Button variant="outline" onClick={() => compute(c)} disabled={isPending}>
                  Hitung Bobot AHP
                </Button>
                {result && (
                  <AhpResultCard
                    result={result}
                    saved={savedOk[c.id]}
                    loading={isPending}
                    onSave={() => saveBobot(c)}
                    onRevise={() => setResults((r) => ({ ...r, [c.id]: null }))}
                  />
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-3">
        <Button onClick={() => setConfirmAll(true)} disabled={!allOk || isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Simpan Semua & Selesai
        </Button>
      </div>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Simpan bobot AHP?"
        description="Menyimpan bobot AHP akan membuat versi KPI baru. Data penilaian yang sudah ada tidak akan berubah. Lanjutkan?"
        confirmText="Simpan"
        loading={isPending}
        onConfirm={saveAll}
      />
    </div>
  );
}
