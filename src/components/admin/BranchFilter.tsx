"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchOption = { id: number; name: string };

type BranchFilterProps = {
  branches: BranchOption[];
};

const ALL_VALUE = "all";

export function BranchFilter({ branches }: BranchFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("branchId") ?? ALL_VALUE;

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete("branchId");
    } else {
      params.set("branchId", value);
    }
    router.push(`/admin/departemen?${params.toString()}`);
  }

  return (
    <div className="w-full sm:w-64">
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Semua Cabang" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Cabang</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={String(branch.id)}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
