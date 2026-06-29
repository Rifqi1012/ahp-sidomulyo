"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  FileArchive,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import {
  getRekapData,
  type PeriodOption,
  type RekapRow,
} from "@/app/actions/report";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodMultiSelect } from "@/components/laporan/PeriodMultiSelect";
import { ExportToolbar } from "@/components/laporan/ExportToolbar";
import { RekapTable } from "@/components/laporan/RekapTable";
import { cn } from "@/lib/utils";

type Option = { id: number; name: string };

export function LaporanClient({
  role,
  basePath,
  scopeLabel,
  periods,
  branches,
}: {
  role: string;
  basePath: string;
  scopeLabel: string;
  periods: PeriodOption[];
  branches: Option[];
}) {
  const isKd = role === "kepala_divisi";
  const showBranch = role === "hrd";

  const [type, setType] = useState<"atas" | "bawah">(isKd ? "bawah" : "atas");
  const [periodIds, setPeriodIds] = useState<number[]>(
    periods[0] ? [periods[0].id] : [],
  );
  const [branchId, setBranchId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const selectedPeriods = useMemo(
    () => periods.filter((p) => periodIds.includes(p.id)).slice().reverse(),
    [periods, periodIds],
  );

  // Ambil data rekap saat filter berubah (debounce search).
  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      getRekapData({
        type,
        periodIds,
        branchId:
          showBranch && branchId !== "all" ? Number(branchId) : undefined,
        search: search.trim() || undefined,
      })
        .then((rows) => {
          setData(rows);
          setSelected(new Set());
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [type, periodIds, branchId, search, showBranch]);

  function toggleRow(userId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === data.length ? new Set() : new Set(data.map((r) => r.userId)),
    );
  }

  async function doExcel(rows: RekapRow[]) {
    if (rows.length === 0) return toast.error("Tidak ada data untuk diekspor.");
    setBusy(true);
    try {
      const [{ generateRekapExcel }, { downloadBlob, fileDateStamp }] =
        await Promise.all([
          import("@/lib/export/exportExcel"),
          import("@/lib/export/downloadHelper"),
        ]);
      const blob = generateRekapExcel(rows, selectedPeriods, type);
      downloadBlob(blob, `Rekap_Penilaian_${scopeLabel}_${fileDateStamp()}.xlsx`);
      toast.success("Excel berhasil dibuat.");
    } catch {
      toast.error("Gagal membuat Excel.");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function doPdfZip(rows: RekapRow[]) {
    const entries = rows.flatMap((r) =>
      r.periodeScores
        .filter((p) => p.finalScoreId != null)
        .map((p) => ({
          finalScoreId: p.finalScoreId!,
          name: r.name,
          periodName: p.periodName,
        })),
    );
    if (entries.length === 0)
      return toast.error("Tidak ada hasil lengkap untuk diekspor.");
    setBusy(true);
    try {
      const [{ generatePdfZip }, { downloadBlob, fileDateStamp }] =
        await Promise.all([
          import("@/lib/export/exportPdfZip"),
          import("@/lib/export/downloadHelper"),
        ]);
      const blob = await generatePdfZip(entries);
      downloadBlob(blob, `Laporan_PDF_${scopeLabel}_${fileDateStamp()}.zip`);
      toast.success(`${entries.length} PDF dikompres ke ZIP.`);
    } catch {
      toast.error("Gagal membuat PDF ZIP.");
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  const selectedRows = data.filter((r) => selected.has(r.userId));

  return (
    <div className="mx-auto max-w-[92rem] space-y-6">
      <PageHeader
        title="Laporan Kinerja"
        description="Rekap hasil penilaian per periode."
      />

      {/* Filter bar */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {!isKd && (
          <div className="flex gap-1 border-b border-slate-200">
            {(["atas", "bawah"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  type === t
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                {t === "atas" ? "Jabatan Pengawas" : "Jabatan Pelaksana"}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Periode</Label>
            <PeriodMultiSelect
              periods={periods}
              selected={periodIds}
              onChange={setPeriodIds}
            />
          </div>
          {showBranch && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Cabang</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Cari Nama</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama karyawan..."
            />
          </div>
          <div className="flex items-end">
            <div className="relative">
              <Button onClick={() => setMenuOpen((v) => !v)} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Export Semua
                <ChevronDown className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => doExcel(data)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      Export Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => doPdfZip(data)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <FileArchive className="h-4 w-4 text-blue-600" />
                      Export PDF ZIP
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ExportToolbar
        selectedCount={selected.size}
        busy={busy}
        onExportExcel={() => doExcel(selectedRows)}
        onExportPdfZip={() => doPdfZip(selectedRows)}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 text-sm text-slate-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat data...
        </div>
      ) : (
        <RekapTable
          data={data}
          periods={selectedPeriods}
          basePath={basePath}
          selected={selected}
          onToggle={toggleRow}
          onToggleAll={toggleAll}
        />
      )}
    </div>
  );
}
