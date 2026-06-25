"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Option = { id: number; name: string };

type EmployeeFiltersProps = {
  branches: Option[];
  jabatan: Option[];
};

const ALL = "all";

export function EmployeeFilters({ branches, jabatan }: EmployeeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const branchId = searchParams.get("branchId") ?? ALL;
  const departmentId = searchParams.get("departmentId") ?? ALL;
  const jabatanId = searchParams.get("jabatanId") ?? ALL;
  const status = searchParams.get("status") ?? ALL;

  const [departments, setDepartments] = useState<Option[]>([]);

  // Muat departemen ketika cabang dipilih.
  useEffect(() => {
    if (branchId === ALL) {
      setDepartments([]);
      return;
    }
    let active = true;
    fetch(`/api/internal/departments?branchId=${branchId}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) setDepartments(data.departments ?? []);
      })
      .catch(() => active && setDepartments([]));
    return () => {
      active = false;
    };
  }, [branchId]);

  function update(key: string, value: string, resetDept = false) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    if (resetDept) params.delete("departmentId");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Cabang</Label>
        <Select
          value={branchId}
          onValueChange={(v) => update("branchId", v, true)}
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

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Departemen</Label>
        <Select
          value={departmentId}
          onValueChange={(v) => update("departmentId", v)}
          disabled={branchId === ALL}
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

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Jabatan</Label>
        <Select value={jabatanId} onValueChange={(v) => update("jabatanId", v)}>
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

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Status</Label>
        <Select value={status} onValueChange={(v) => update("status", v)}>
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
