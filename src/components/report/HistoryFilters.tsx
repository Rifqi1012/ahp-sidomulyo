"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BranchOption, PeriodOption } from "@/app/actions/report";

const ALL = "all";

export function HistoryFilters({
  periods,
  branches,
  showPeriodBranch = true,
}: {
  periods: PeriodOption[];
  branches: BranchOption[];
  showPeriodBranch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce pencarian nama.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (search !== current) update("search", search);
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {showPeriodBranch && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Periode</Label>
            <Select
              value={searchParams.get("periodId") ?? ALL}
              onValueChange={(v) => update("periodId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Periode</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Cabang</Label>
            <Select
              value={searchParams.get("branchId") ?? ALL}
              onValueChange={(v) => update("branchId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Cabang</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Level Jabatan</Label>
        <Select
          value={searchParams.get("level") ?? ALL}
          onValueChange={(v) => update("level", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Semua Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Level</SelectItem>
            <SelectItem value="atas">Jabatan Atas</SelectItem>
            <SelectItem value="bawah">Jabatan Bawah</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Cari Nama</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nama karyawan..."
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}
