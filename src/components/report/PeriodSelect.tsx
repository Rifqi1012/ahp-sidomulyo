"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodOption } from "@/app/actions/report";

export function PeriodSelect({
  periods,
  current,
}: {
  periods: PeriodOption[];
  current?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodId", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-full sm:w-72">
      <Select value={current ? String(current) : ""} onValueChange={onChange}>
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
  );
}
