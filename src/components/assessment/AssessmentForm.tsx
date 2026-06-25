"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Countdown } from "@/components/shared/Countdown";
import { cn } from "@/lib/utils";
import {
  saveDraft,
  submitAssessment,
  type AssessmentFormData,
  type ScoreInput,
} from "@/app/actions/assessment";

const SCALE = [
  { value: 1, short: "SK", label: "Sangat Kurang" },
  { value: 2, short: "K", label: "Kurang" },
  { value: 3, short: "C", label: "Cukup" },
  { value: 4, short: "B", label: "Baik" },
  { value: 5, short: "SB", label: "Sangat Baik" },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type AssessmentFormProps = {
  data: AssessmentFormData;
  basePath: string;
};

export function AssessmentForm({ data, basePath }: AssessmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<number, number>>(data.scores);
  const [submitOpen, setSubmitOpen] = useState(false);

  const readonly = data.readonly;
  const allSubs = useMemo(
    () => data.criteria.flatMap((c) => c.subcriteria),
    [data.criteria],
  );
  const total = allSubs.length;
  const filled = allSubs.filter((s) => (scores[s.id] ?? 0) >= 1).length;
  const progressPct = total > 0 ? Math.round((filled / total) * 100) : 0;

  function toScoreInputs(): ScoreInput[] {
    return Object.entries(scores)
      .filter(([, v]) => v >= 1)
      .map(([k, v]) => ({ subcriteriaId: Number(k), score: v }));
  }

  function handleSaveDraft() {
    startTransition(async () => {
      const result = await saveDraft(data.assessmentId, toScoreInputs());
      if (result.success) {
        toast.success("Draft penilaian disimpan.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitAssessment(data.assessmentId, toScoreInputs());
      if (result.success) {
        toast.success("Penilaian berhasil disubmit.");
        setSubmitOpen(false);
        router.push(`${basePath}/penilaian`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header assessee */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-slate-500">Menilai</p>
            <h1 className="text-lg font-semibold text-slate-900">
              {data.assessee.name}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {data.assessee.jabatanName} · {data.assessee.departmentName} ·{" "}
              {data.assessee.branchName}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="text-slate-600">Periode: {data.period.name}</p>
            <Countdown deadline={data.period.deadline} />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {filled} dari {total} subkriteria sudah diisi
          </span>
          <span className="font-medium text-slate-900">{progressPct}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {readonly && (
        <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600">
          Mode lihat — penilaian{" "}
          {data.status === "SUBMITTED" ? "sudah disubmit" : "tidak dapat diubah"}.
        </div>
      )}

      {/* Form per kriteria */}
      <div className="space-y-5">
        {data.criteria.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {LETTERS[i]}. {c.name}
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {c.subcriteria.map((s) => (
                <div key={s.id} className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SCALE.map((opt) => {
                      const selected = scores[s.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={readonly || isPending}
                          onClick={() =>
                            setScores((p) => ({ ...p, [s.id]: opt.value }))
                          }
                          className={cn(
                            "flex h-12 w-12 flex-col items-center justify-center rounded-lg border text-sm transition-colors disabled:opacity-60",
                            selected
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
                          )}
                        >
                          <span className="font-semibold">{opt.value}</span>
                          <span className="text-[10px] leading-none">
                            {opt.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href={`${basePath}/penilaian`}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        {!readonly && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Draft
            </Button>
            <Button
              onClick={() => setSubmitOpen(true)}
              disabled={isPending || filled < total}
            >
              <Send className="h-4 w-4" />
              Submit Penilaian
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit penilaian?"
        description="Setelah di-submit, penilaian tidak dapat diubah. Pastikan semua nilai sudah benar. Lanjutkan?"
        confirmText="Submit"
        loading={isPending}
        onConfirm={handleSubmit}
      />
    </div>
  );
}
