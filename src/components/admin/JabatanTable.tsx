"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, Inbox, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { levelBadge, SCOPE_BADGE, roleLabel } from "@/lib/labels";
import {
  deleteJabatan,
  type JabatanWithCount,
} from "@/app/actions/jabatan";

type JabatanTableProps = {
  jabatan: JabatanWithCount[];
};

export function JabatanTable({ jabatan }: JabatanTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<JabatanWithCount | null>(null);

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await deleteJabatan(target.id);
      if (result.success) {
        toast.success("Jabatan berhasil dinonaktifkan.");
        setTarget(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns: Column<JabatanWithCount>[] = [
    {
      header: "Nama",
      cell: (row) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      header: "Level KPI",
      cell: (row) => {
        const cfg = levelBadge(row.level);
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      header: "Role",
      cell: (row) => (
        <span className="text-slate-600">{roleLabel(row.roleSystem)}</span>
      ),
    },
    {
      header: "Scope",
      cell: (row) => {
        const cfg = SCOPE_BADGE[row.scope];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      header: "Pemegang",
      headerClassName: "text-center",
      className: "text-center",
      cell: (row) => (
        <span className="text-slate-700">{row.activeUserCount}</span>
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
                  <Link href={`/admin/jabatan/${row.id}/edit`}>
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
        data={jabatan}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-4">
            <Inbox className="h-8 w-8 text-slate-300" />
            <span>Belum ada jabatan pada kategori ini.</span>
          </div>
        }
      />

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Nonaktifkan jabatan?"
        description={
          target
            ? `Jabatan "${target.name}" akan dinonaktifkan dari sistem.`
            : undefined
        }
        confirmText="Nonaktifkan"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
