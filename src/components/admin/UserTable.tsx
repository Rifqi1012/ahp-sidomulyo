"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Inbox, KeyRound, Pencil, Power, ShieldCheck } from "lucide-react";

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
import { roleLabel } from "@/lib/labels";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";
import { resetPassword, toggleActive } from "@/app/actions/employee";
import type { UserWithBranch } from "@/app/actions/user";

type UserTableProps = {
  users: UserWithBranch[];
};

type ActionState =
  | { type: "reset"; user: UserWithBranch }
  | { type: "toggle"; user: UserWithBranch }
  | null;

export function UserTable({ users }: UserTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<ActionState>(null);

  function handleConfirm() {
    if (!action) return;
    startTransition(async () => {
      if (action.type === "reset") {
        const result = await resetPassword(action.user.id);
        result.success
          ? toast.success('Password direset ke "password".')
          : toast.error(result.error);
      } else {
        const result = await toggleActive(action.user.id);
        result.success
          ? toast.success(
              action.user.isActive ? "User dinonaktifkan." : "User diaktifkan.",
            )
          : toast.error(result.error);
      }
      setAction(null);
      router.refresh();
    });
  }

  const columns: Column<UserWithBranch>[] = [
    {
      header: "Nama",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{row.name}</span>
          {row.email === PROTECTED_ADMIN_EMAIL && (
            <Badge variant="blue">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Admin Utama
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Email",
      cell: (row) => <span className="text-slate-600">{row.email}</span>,
    },
    {
      header: "Role",
      cell: (row) => <span className="text-slate-600">{roleLabel(row.role)}</span>,
    },
    {
      header: "Cabang",
      cell: (row) => (
        <span className="text-slate-600">{row.branch?.name ?? "—"}</span>
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
      cell: (row) => {
        const isProtected = row.email === PROTECTED_ADMIN_EMAIL;
        return (
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center justify-end gap-1">
              {!isProtected && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/users/${row.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Role</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAction({ type: "reset", user: row })}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Password</TooltipContent>
              </Tooltip>

              {!isProtected && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={
                        row.isActive
                          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                          : "text-green-600 hover:bg-green-50 hover:text-green-700"
                      }
                      onClick={() => setAction({ type: "toggle", user: row })}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {row.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      },
    },
  ];

  const dialogProps =
    action?.type === "reset"
      ? {
          title: "Reset password user?",
          description: `Password ${action.user.name} akan direset menjadi "password".`,
          confirmText: "Reset",
        }
      : action?.type === "toggle"
        ? {
            title: action.user.isActive
              ? "Nonaktifkan user?"
              : "Aktifkan user?",
            description: `${action.user.name} akan ${
              action.user.isActive ? "dinonaktifkan" : "diaktifkan"
            }.`,
            confirmText: action.user.isActive ? "Nonaktifkan" : "Aktifkan",
          }
        : { title: "", description: undefined, confirmText: "Konfirmasi" };

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-4">
            <Inbox className="h-8 w-8 text-slate-300" />
            <span>Tidak ada user untuk filter ini.</span>
          </div>
        }
      />

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={dialogProps.title}
        description={dialogProps.description}
        confirmText={dialogProps.confirmText}
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
