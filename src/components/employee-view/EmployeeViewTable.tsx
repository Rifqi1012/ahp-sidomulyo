"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Eye,
  Inbox,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { roleLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type EmployeeViewRow = {
  id: number;
  name: string;
  email: string;
  jabatanName: string;
  departmentName: string;
  branchName: string;
  role: string;
  isActive: boolean;
};

export type ViewVariant = "hrd" | "kc" | "kd";

type ColumnKey =
  | "no"
  | "name"
  | "email"
  | "jabatan"
  | "department"
  | "branch"
  | "role"
  | "status"
  | "action";

const COLUMNS: Record<ViewVariant, ColumnKey[]> = {
  hrd: ["no", "name", "email", "jabatan", "department", "branch", "role", "status", "action"],
  kc: ["no", "name", "email", "jabatan", "department", "role", "status", "action"],
  kd: ["no", "name", "email", "jabatan", "status", "action"],
};

const HEADERS: Record<ColumnKey, string> = {
  no: "No",
  name: "Nama",
  email: "Email",
  jabatan: "Jabatan",
  department: "Departemen",
  branch: "Cabang",
  role: "Role",
  status: "Status",
  action: "Aksi",
};

// Kolom yang bisa di-sort + key sortBy-nya.
const SORTABLE: Partial<Record<ColumnKey, string>> = {
  name: "name",
  branch: "branch",
  department: "department",
  jabatan: "jabatan",
  status: "status",
};

function SortHeader({ col }: { col: ColumnKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sortKey = SORTABLE[col];

  if (!sortKey) {
    return <span>{HEADERS[col]}</span>;
  }

  const activeSort = searchParams.get("sortBy");
  const activeOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
  const isActive = activeSort === sortKey;

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", sortKey!);
    params.set("sortOrder", isActive && activeOrder === "asc" ? "desc" : "asc");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1 hover:text-slate-900"
    >
      {HEADERS[col]}
      {!isActive ? (
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
      ) : activeOrder === "asc" ? (
        <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
      )}
    </button>
  );
}

export function EmployeeViewTable({
  variant,
  rows,
  basePath,
  startIndex,
}: {
  variant: ViewVariant;
  rows: EmployeeViewRow[];
  basePath: string;
  startIndex: number;
}) {
  const cols = COLUMNS[variant];

  function renderCell(col: ColumnKey, row: EmployeeViewRow, idx: number) {
    switch (col) {
      case "no":
        return <span className="text-slate-500">{startIndex + idx + 1}</span>;
      case "name":
        return <span className="font-medium text-slate-900">{row.name}</span>;
      case "email":
        return <span className="text-slate-600">{row.email}</span>;
      case "jabatan":
        return <span className="text-slate-600">{row.jabatanName}</span>;
      case "department":
        return <span className="text-slate-600">{row.departmentName}</span>;
      case "branch":
        return <span className="text-slate-600">{row.branchName}</span>;
      case "role":
        return <span className="text-slate-600">{roleLabel(row.role)}</span>;
      case "status":
        return <StatusBadge status={row.isActive ? "active" : "inactive"} />;
      case "action":
        return (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`${basePath}/karyawan/${row.id}`}>
              <Eye className="h-4 w-4" />
              Detail
            </Link>
          </Button>
        );
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {cols.map((col) => (
              <th
                key={col}
                className={cn(
                  "px-4 py-2.5 text-left font-medium",
                  col === "action" && "text-right",
                  col === "no" && "w-12",
                )}
              >
                {col === "action" ? HEADERS[col] : <SortHeader col={col} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={cols.length}
                className="py-12 text-center text-sm text-slate-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <Inbox className="h-8 w-8 text-slate-300" />
                  Tidak ada karyawan untuk filter ini.
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id} className="border-t border-slate-100">
                {cols.map((col) => (
                  <td
                    key={col}
                    className={cn(
                      "px-4 py-2.5",
                      col === "action" && "text-right",
                    )}
                  >
                    {renderCell(col, row, idx)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
