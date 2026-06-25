"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateLong } from "@/lib/format";
import {
  durationLabel,
  parseDateInput,
  suggestEndDate,
  toDateInput,
} from "@/lib/period";
import {
  createPeriod,
  updatePeriod,
  type ActionResult,
} from "@/app/actions/period";

type PeriodFormProps = {
  mode: "create" | "edit";
  /** Label tombol simpan (mis. "Simpan sebagai Draft"). */
  submitLabel?: string;
  /** Sembunyikan tombol Kembali (untuk form inline). */
  hideBack?: boolean;
  period?: {
    id: number;
    startDate: string; // yyyy-mm-dd
    endDate: string; // yyyy-mm-dd
    cycleOrder: number | null;
  };
};

export function PeriodForm({
  mode,
  submitLabel = "Simpan",
  hideBack = false,
  period,
}: PeriodFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(period?.startDate ?? "");
  const [endDate, setEndDate] = useState(period?.endDate ?? "");
  const [previewName, setPreviewName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Preview nama otomatis (debounce) via API.
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!startDate) {
      setPreviewName("");
      return;
    }
    const params = new URLSearchParams({ start: startDate });
    if (period?.cycleOrder) params.set("order", String(period.cycleOrder));
    else if (mode === "edit" && period) params.set("excludeId", String(period.id));

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/internal/period-name?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setPreviewName(d.name ?? ""))
        .catch(() => setPreviewName(""));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [startDate, mode, period]);

  function handleStartChange(value: string) {
    setStartDate(value);
    // Auto-suggest tanggal selesai = mulai + 3 bulan (bisa diubah manual).
    const start = parseDateInput(value);
    if (start) setEndDate(toDateInput(suggestEndDate(start)));
  }

  const startObj = parseDateInput(startDate);
  const endObj = parseDateInput(endDate);
  const deadlineStr = startObj
    ? formatDateLong(new Date(startObj.getTime() + 7 * 86_400_000))
    : "—";
  const durationStr =
    startObj && endObj && endObj >= startObj
      ? durationLabel(startObj, endObj)
      : "—";

  function handleResult(result: ActionResult, msg: string) {
    if (result.success) {
      toast.success(msg);
      if (mode === "create") {
        setStartDate("");
        setEndDate("");
        setPreviewName("");
        router.refresh();
      } else {
        router.push("/hrd/periode");
        router.refresh();
      }
    } else {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    startTransition(async () => {
      if (mode === "create") {
        handleResult(
          await createPeriod({ startDate, endDate }),
          "Periode berhasil dibuat.",
        );
      } else if (period) {
        handleResult(
          await updatePeriod(period.id, { startDate, endDate }),
          "Periode berhasil diperbarui.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Tanggal Mulai</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleStartChange(e.target.value)}
            disabled={isPending}
          />
          {fieldErrors.startDate && (
            <p className="text-sm text-destructive">{fieldErrors.startDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">Tanggal Selesai</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isPending}
          />
          {fieldErrors.endDate && (
            <p className="text-sm text-destructive">{fieldErrors.endDate}</p>
          )}
        </div>
      </div>

      {/* Preview otomatis */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <ClipboardList className="h-4 w-4 text-blue-500" />
          Preview Periode
        </div>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 text-slate-500">Nama</dt>
            <dd className="font-medium text-slate-900">{previewName || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 text-slate-500">Deadline</dt>
            <dd className="font-medium text-slate-900">{deadlineStr}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 text-slate-500">Durasi</dt>
            <dd className="font-medium text-slate-900">{durationStr}</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        {!hideBack && (
          <Button type="button" variant="outline" asChild disabled={isPending}>
            <Link href="/hrd/periode">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
