"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, Inbox, Pencil } from "lucide-react";
import type { Branch } from "@prisma/client";

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
import { deleteBranch } from "@/app/actions/branch";

type BranchTableProps = {
  branches: Branch[];
};

export function BranchTable({ branches }: BranchTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<Branch | null>(null);

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteBranch(target.id);
      if (result.success) {
        toast.success("Cabang berhasil dinonaktifkan.");
        setTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns: Column<Branch>[] = [
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
      header: "Alamat",
      cell: (row) => (
        <span className="text-slate-600">{row.address || "—"}</span>
      ),
    },
    {
      header: "Tipe",
      cell: (row) => (
        <StatusBadge status={row.isPusat ? "pusat" : "cabang"} />
      ),
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
                  <Link href={`/admin/cabang/${row.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            {!row.isPusat && row.isActive && (
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
        data={branches}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-4">
            <Inbox className="h-8 w-8 text-slate-300" />
            <span>Belum ada cabang. Tambahkan cabang baru.</span>
          </div>
        }
      />

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Nonaktifkan cabang?"
        description={
          target
            ? `Cabang "${target.name}" akan dinonaktifkan dan tidak tampil aktif di sistem.`
            : undefined
        }
        confirmText="Nonaktifkan"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
