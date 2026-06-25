"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Play,
  Save,
  StopCircle,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodStatusBadge } from "@/components/hrd/PeriodStatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatDate } from "@/lib/format";
import {
  computeDeadline,
  parseDateInput,
  suggestEndDate,
  toDateInput,
  toRoman,
} from "@/lib/period";
import {
  activatePeriod,
  forceClosePeriod,
  savePeriodRow,
  startAutoCycle,
  type CycleRow,
} from "@/app/actions/period";

type PeriodCycleManagerProps = {
  rows: CycleRow[];
  allClosed: boolean;
};

type LocalDates = Record<number, { start: string; end: string }>;

const ORDERS = [1, 2, 3];

export function PeriodCycleManager({ rows, allClosed }: PeriodCycleManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [local, setLocal] = useState<LocalDates>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const [newCycleMode, setNewCycleMode] = useState(false);
  const [cycleConfirm, setCycleConfirm] = useState(false);
  const [forceTarget, setForceTarget] = useState<CycleRow | null>(null);

  // Saat batch tak lagi semuanya selesai, keluar dari mode siklus baru.
  useEffect(() => {
    if (!allClosed) setNewCycleMode(false);
  }, [allClosed]);

  const ignoreSaved = allClosed && newCycleMode;
  const savedByOrder = new Map<number, CycleRow>();
  if (!ignoreSaved) rows.forEach((r) => savedByOrder.set(r.cycleOrder, r));

  // Tombol "Mulai Siklus Otomatis" aktif jika 3 baris tersimpan & semua DRAFT.
  const allThreeDraft =
    !ignoreSaved &&
    ORDERS.every((o) => savedByOrder.get(o)?.status === "DRAFT") &&
    savedByOrder.size === 3;

  function getDates(order: number): { start: string; end: string } {
    return local[order] ?? { start: "", end: "" };
  }

  function setStart(order: number, value: string) {
    const start = parseDateInput(value);
    const end = start ? toDateInput(suggestEndDate(start)) : "";
    setLocal((p) => ({ ...p, [order]: { start: value, end } }));
    setRowError((e) => ({ ...e, [order]: "" }));
  }

  function setEnd(order: number, value: string) {
    setLocal((p) => ({
      ...p,
      [order]: { start: getDates(order).start, end: value },
    }));
    setRowError((e) => ({ ...e, [order]: "" }));
  }

  function prevEndOf(order: number): string | null {
    if (order <= 1) return null;
    const prevSaved = savedByOrder.get(order - 1);
    if (prevSaved) return prevSaved.endDate;
    const prevLocal = local[order - 1];
    return prevLocal?.end || null;
  }

  function validateRow(order: number): string | null {
    const { start, end } = getDates(order);
    if (!start || !end) return "Tanggal mulai & selesai wajib diisi.";
    if (end <= start) return "Tanggal selesai harus setelah tanggal mulai.";
    if (order > 1) {
      const prevEnd = prevEndOf(order);
      if (!prevEnd) return `Lengkapi Periode ${toRoman(order - 1)} terlebih dahulu.`;
      if (start <= prevEnd)
        return `Tanggal mulai harus setelah selesainya Periode ${toRoman(order - 1)}.`;
    }
    return null;
  }

  function handleSave(order: number) {
    const err = validateRow(order);
    if (err) {
      setRowError((e) => ({ ...e, [order]: err }));
      return;
    }
    const { start, end } = getDates(order);
    startTransition(async () => {
      const result = await savePeriodRow({ order, startDate: start, endDate: end });
      if (result.success) {
        toast.success(`Periode ${toRoman(order)} disimpan.`);
        setEditing(null);
        setLocal((p) => {
          const next = { ...p };
          delete next[order];
          return next;
        });
        router.refresh();
      } else {
        setRowError((e) => ({ ...e, [order]: result.error }));
        toast.error(result.error);
      }
    });
  }

  function handleEdit(row: CycleRow) {
    setEditing(row.cycleOrder);
    setLocal((p) => ({
      ...p,
      [row.cycleOrder]: { start: row.startDate, end: row.endDate },
    }));
  }

  function handleCancelEdit(order: number) {
    setEditing(null);
    setLocal((p) => {
      const next = { ...p };
      delete next[order];
      return next;
    });
    setRowError((e) => ({ ...e, [order]: "" }));
  }

  function handleActivate(row: CycleRow) {
    startTransition(async () => {
      const result = await activatePeriod(row.id);
      result.success
        ? toast.success(`Periode ${toRoman(row.cycleOrder)} diaktifkan.`)
        : toast.error(result.error);
      router.refresh();
    });
  }

  function handleForceClose() {
    if (!forceTarget) return;
    startTransition(async () => {
      const result = await forceClosePeriod(forceTarget.id);
      result.success
        ? toast.success("Periode ditutup, periode berikutnya diaktifkan.")
        : toast.error(result.error);
      setForceTarget(null);
      router.refresh();
    });
  }

  function handleStartCycle() {
    startTransition(async () => {
      const result = await startAutoCycle();
      if (result.success) {
        toast.success("Siklus otomatis dimulai. Periode I diaktifkan.");
        setCycleConfirm(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function renderStatus(order: number) {
    const saved = savedByOrder.get(order);
    if (saved) return <PeriodStatusBadge status={saved.status} />;
    const { start, end } = getDates(order);
    if (start || end) return <Badge variant="yellow">Belum Disimpan</Badge>;
    return <Badge variant="slate">Belum Diatur</Badge>;
  }

  function renderRow(order: number) {
    const saved = savedByOrder.get(order);
    const isEditing = editing === order;
    const editable = !saved || isEditing;
    const { start, end } = getDates(order);
    const startObj = parseDateInput(editable ? start : saved!.startDate);
    const deadlineStr = startObj
      ? formatDate(computeDeadline(startObj))
      : saved
        ? formatDate(saved.deadline)
        : "—";
    const error = rowError[order];

    return (
      <TableRow key={order}>
        <TableCell className="text-slate-500">{order}</TableCell>
        <TableCell className="font-medium text-slate-900">
          Periode {toRoman(order)}
        </TableCell>

        {/* Tgl Mulai */}
        <TableCell>
          {editable ? (
            <Input
              type="date"
              value={start}
              onChange={(e) => setStart(order, e.target.value)}
              disabled={isPending}
              className="h-9 w-40"
            />
          ) : (
            <span className="text-slate-600">{formatDate(saved!.startDate)}</span>
          )}
        </TableCell>

        {/* Tgl Selesai */}
        <TableCell>
          {editable ? (
            <Input
              type="date"
              value={end}
              onChange={(e) => setEnd(order, e.target.value)}
              disabled={isPending}
              className="h-9 w-40"
            />
          ) : (
            <span className="text-slate-600">{formatDate(saved!.endDate)}</span>
          )}
        </TableCell>

        {/* Deadline (read-only) */}
        <TableCell className="text-slate-600">{deadlineStr}</TableCell>

        {/* Status */}
        <TableCell>{renderStatus(order)}</TableCell>

        {/* Aksi */}
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {editable ? (
              <>
                {(start || end) && (
                  <Button
                    size="sm"
                    onClick={() => handleSave(order)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Simpan
                  </Button>
                )}
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelEdit(order)}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                    Batal
                  </Button>
                )}
              </>
            ) : saved!.status === "DRAFT" ? (
              <TooltipProvider delayDuration={200}>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleActivate(saved!)}
                  disabled={isPending}
                >
                  <Play className="h-4 w-4" />
                  Aktifkan
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(saved!)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit tanggal</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : saved!.status === "ACTIVE" ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setForceTarget(saved!)}
                disabled={isPending}
              >
                <StopCircle className="h-4 w-4" />
                Tutup Paksa
              </Button>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <PageHeader
        title="Kelola Periode"
        description="Atur 3 periode penilaian dalam satu siklus tahunan."
        action={
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    onClick={() => setCycleConfirm(true)}
                    disabled={!allThreeDraft || isPending}
                  >
                    <Zap className="h-4 w-4" />
                    Mulai Siklus Otomatis
                  </Button>
                </span>
              </TooltipTrigger>
              {!allThreeDraft && (
                <TooltipContent>
                  Simpan tanggal semua periode terlebih dahulu
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        }
      />

      {/* Banner siklus selesai */}
      {allClosed && !newCycleMode && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              Seluruh periode tahun ini telah selesai
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setNewCycleMode(true);
              setLocal({});
              setEditing(null);
            }}
          >
            <Zap className="h-4 w-4" />
            Mulai Siklus Baru untuk Tahun Berikutnya
          </Button>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-slate-50">
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Tgl Mulai</TableHead>
              <TableHead>Tgl Selesai</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{ORDERS.map((order) => renderRow(order))}</TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={cycleConfirm}
        onOpenChange={setCycleConfirm}
        title="Mulai siklus otomatis?"
        description="Sistem akan mengaktifkan Periode I sekarang dan mengaktifkan periode berikutnya secara otomatis setelah periode sebelumnya selesai. Lanjutkan?"
        confirmText="Mulai Siklus"
        loading={isPending}
        onConfirm={handleStartCycle}
      />

      <ConfirmDialog
        open={forceTarget !== null}
        onOpenChange={(open) => !open && setForceTarget(null)}
        title="Tutup paksa periode?"
        description="Menutup periode ini akan langsung mengaktifkan Periode berikutnya. Lanjutkan?"
        confirmText="Tutup Paksa"
        loading={isPending}
        onConfirm={handleForceClose}
      />
    </>
  );
}
