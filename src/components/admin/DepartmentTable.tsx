"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, Inbox, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  deleteDepartment,
  type DepartmentWithBranch,
} from "@/app/actions/department";

type DepartmentTableProps = {
  departments: DepartmentWithBranch[];
};

export function DepartmentTable({ departments }: DepartmentTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<DepartmentWithBranch | null>(null);

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteDepartment(target.id);
      if (result.success) {
        toast.success("Departemen berhasil dinonaktifkan.");
        setTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns: Column<DepartmentWithBranch>[] = [
    {
      header: "No",
      headerClassName: "w-12",
      cell: (_row, i) => <span className="text-slate-500">{i + 1}</span>,
    },
    {
      header: "Nama",
      cell: (row) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      header: "Cabang",
      cell: (row) => <span className="text-slate-600">{row.branch.name}</span>,
    },
    {
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.isActive ? "active" : "inactive"} />
      ),
    },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/admin/departemen/${row.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            {row.isActive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setTarget(row)}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nonaktifkan</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={departments}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-4">
            <Inbox className="h-8 w-8 text-slate-300" />
            <span>Belum ada departemen untuk filter ini.</span>
          </div>
        }
      />

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Nonaktifkan departemen?"
        description={
          target
            ? `Departemen "${target.name}" akan dinonaktifkan dari sistem.`
            : undefined
        }
        confirmText="Nonaktifkan"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
