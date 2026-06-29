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
import { roleLabel } from "@/lib/labels";
import type { ViewVariant } from "@/components/employee-view/EmployeeViewTable";

type Option = { id: number; name: string };
const ALL = "all";

const ROLE_OPTIONS: Record<ViewVariant, string[]> = {
  hrd: ["kepala_cabang", "kepala_divisi", "karyawan"],
  kc: ["kepala_divisi", "karyawan"],
  kd: [],
};

export function EmployeeViewFilterBar({
  variant,
  branches = [],
  fixedBranchId,
  fixedDepartmentId,
}: {
  variant: ViewVariant;
  branches?: Option[];
  fixedBranchId?: number;
  fixedDepartmentId?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const showBranch = variant === "hrd";
  const showDept = variant === "hrd" || variant === "kc";
  const showRole = variant === "hrd" || variant === "kc";

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [departments, setDepartments] = useState<Option[]>([]);
  const [jabatan, setJabatan] = useState<Option[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const urlBranchId = searchParams.get("branchId") ?? undefined;
  const urlDeptId = searchParams.get("departmentId") ?? undefined;

  const effBranchId =
    variant === "hrd" ? urlBranchId : fixedBranchId?.toString();
  const effDeptId =
    variant === "kd" ? fixedDepartmentId?.toString() : urlDeptId;

  function update(key: string, value: string, resets: string[] = []) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    resets.forEach((r) => params.delete(r));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce pencarian nama (300ms).
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (search !== current) update("search", search);
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Muat departemen sesuai cabang efektif.
  useEffect(() => {
    if (!showDept || !effBranchId) {
      setDepartments([]);
      return;
    }
    let active = true;
    fetch(`/api/internal/departments?branchId=${effBranchId}`)
      .then((r) => r.json())
      .then((d) => active && setDepartments(d.departments ?? []))
      .catch(() => active && setDepartments([]));
    return () => {
      active = false;
    };
  }, [showDept, effBranchId]);

  // Muat jabatan sesuai cabang (+ departemen) efektif.
  useEffect(() => {
    if (!effBranchId) {
      setJabatan([]);
      return;
    }
    const params = new URLSearchParams({ branchId: effBranchId });
    if (effDeptId) params.set("departmentId", effDeptId);
    let active = true;
    fetch(`/api/internal/jabatan?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => active && setJabatan(d.jabatan ?? []))
      .catch(() => active && setJabatan([]));
    return () => {
      active = false;
    };
  }, [effBranchId, effDeptId]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Cari Nama</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nama..."
            className="pl-9"
          />
        </div>
      </div>

      {showBranch && (
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Cabang</Label>
          <Select
            value={urlBranchId ?? ALL}
            onValueChange={(v) =>
              update("branchId", v, ["departmentId", "jabatanId"])
            }
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
      )}

      {showDept && (
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Departemen</Label>
          <Select
            value={urlDeptId ?? ALL}
            onValueChange={(v) => update("departmentId", v, ["jabatanId"])}
            disabled={!effBranchId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Departemen</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Jabatan</Label>
        <Select
          value={searchParams.get("jabatanId") ?? ALL}
          onValueChange={(v) => update("jabatanId", v)}
          disabled={!effBranchId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Semua Jabatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Jabatan</SelectItem>
            {jabatan.map((j) => (
              <SelectItem key={j.id} value={String(j.id)}>
                {j.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showRole && (
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Role</Label>
          <Select
            value={searchParams.get("role") ?? ALL}
            onValueChange={(v) => update("role", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Role</SelectItem>
              {ROLE_OPTIONS[variant].map((r) => (
                <SelectItem key={r} value={r}>
                  {roleLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Status</Label>
        <Select
          value={searchParams.get("status") ?? ALL}
          onValueChange={(v) => update("status", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
