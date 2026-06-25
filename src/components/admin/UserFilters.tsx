"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ALL_ROLES, roleLabel } from "@/lib/labels";

type Option = { id: number; name: string };

type UserFiltersProps = {
  branches: Option[];
};

const ALL = "all";

export function UserFilters({ branches }: UserFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const role = searchParams.get("role") ?? ALL;
  const branchId = searchParams.get("branchId") ?? ALL;
  const status = searchParams.get("status") ?? ALL;

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Role</Label>
        <Select value={role} onValueChange={(v) => update("role", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua Role</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-slate-500">Cabang</Label>
        <Select value={branchId} onValueChange={(v) => update("branchId", v)}>
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
