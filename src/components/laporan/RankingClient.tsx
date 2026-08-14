"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Eye, Inbox, Loader2, Medal, Trophy } from "lucide-react";

import {
  getRanking,
  type PeriodOption,
  type RankingRow,
} from "@/app/actions/report";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportPdfButton } from "@/components/shared/ExportPdfButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = { id: number; name: string };

const CATEGORY_VARIANT: Record<string, "green" | "blue" | "slate" | "orange"> = {
  "Sangat Baik": "green",
  Baik: "blue",
  Cukup: "slate",
  Kurang: "orange",
  "Sangat Kurang": "orange",
};

const MEDAL = ["text-yellow-500", "text-slate-400", "text-amber-700"];

export function RankingClient({
  role,
  basePath,
  periods,
  branches,
}: {
  role: string;
  basePath: string;
  periods: PeriodOption[];
  branches: Option[];
}) {
  const isKd = role === "kepala_divisi";
  const showBranch = role === "hrd" || role === "direktur";

  const [type, setType] = useState<"atas" | "bawah">(isKd ? "bawah" : "atas");
  const [periodId, setPeriodId] = useState<string>(
    periods[0] ? String(periods[0].id) : "",
  );
  const [branchId, setBranchId] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!periodId) return;
    const h = setTimeout(() => {
      setLoading(true);
      getRanking({
        type,
        periodId: Number(periodId),
        branchId: showBranch && branchId !== "all" ? Number(branchId) : undefined,
        search: search.trim() || undefined,
      })
        .then(setData)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(h);
  }, [type, periodId, branchId, search, showBranch]);

  const podium = useMemo(
    () => data.filter((r) => r.rank != null && r.rank <= 3),
    [data],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Peringkat Kinerja"
        description="Perankingan karyawan berdasarkan nilai akhir per periode."
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Periode</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>
      </div>

      {/* Podium 3 besar */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {podium.map((r) => (
            <div
              key={r.userId}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm",
                r.rank === 1
                  ? "border-yellow-300 ring-1 ring-yellow-200"
                  : "border-slate-200",
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50">
                {r.rank === 1 ? (
                  <Crown className={cn("h-6 w-6", MEDAL[0])} />
                ) : (
                  <Medal className={cn("h-6 w-6", MEDAL[r.rank! - 1])} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{r.name}</p>
                <p className="truncate text-xs text-slate-500">{r.jabatan}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {r.finalScore!.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">Peringkat {r.rank}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabel peringkat */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="px-3 py-2.5 text-center">Peringkat</th>
              <th className="px-3 py-2.5 text-left">Nama</th>
              <th className="px-3 py-2.5 text-left">Jabatan</th>
              <th className="px-3 py-2.5 text-left">Cabang</th>
              <th className="px-3 py-2.5 text-center">Nilai Akhir</th>
              <th className="px-3 py-2.5 text-center">Kategori</th>
              <th className="px-3 py-2.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    ) : (
                      <Inbox className="h-8 w-8 text-slate-300" />
                    )}
                    {loading ? "Memuat..." : "Belum ada data peringkat."}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((r, idx) => (
                <tr key={r.userId} className={cn(idx % 2 === 1 && "bg-slate-50")}>
                  <td className="border-t border-slate-100 px-3 py-2 text-center">
                    {r.rank != null ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-semibold",
                          r.rank <= 3 ? MEDAL[r.rank - 1] : "text-slate-700",
                        )}
                      >
                        {r.rank <= 3 && <Trophy className="h-3.5 w-3.5" />}
                        {r.rank}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Belum lengkap</span>
                    )}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 font-medium text-slate-900">
                    {r.name}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-slate-600">
                    {r.jabatan}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-slate-600">
                    {r.cabang}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-center font-bold text-slate-900">
                    {r.finalScore != null ? r.finalScore.toFixed(2) : "—"}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2 text-center">
                    {r.category ? (
                      <Badge variant={CATEGORY_VARIANT[r.category] ?? "slate"}>
                        {r.category}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-t border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {r.finalScoreId ? (
                        <>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`${basePath}/laporan/${r.finalScoreId}`}>
                              <Eye className="h-4 w-4" />
                              Detail
                            </Link>
                          </Button>
                          <ExportPdfButton
                            finalScoreId={r.finalScoreId}
                            assesseeName={r.name}
                            variant="ghost"
                          />
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
