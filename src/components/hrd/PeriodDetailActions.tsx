"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Lock, Pencil, Trash2 } from "lucide-react";
import type { PeriodStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  activatePeriod,
  closePeriod,
  deletePeriod,
} from "@/app/actions/period";

type PeriodDetailActionsProps = {
  id: number;
  name: string;
  status: PeriodStatus;
};

type DialogType = "activate" | "close" | "delete" | null;

export function PeriodDetailActions({
  id,
  name,
  status,
}: PeriodDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogType>(null);

  function handleConfirm() {
    startTransition(async () => {
      const result =
        dialog === "activate"
          ? await activatePeriod(id)
          : dialog === "close"
            ? await closePeriod(id)
            : dialog === "delete"
              ? await deletePeriod(id)
              : null;
      if (!result) return;

      if (result.success) {
        if (dialog === "activate") {
          toast.success("Periode diaktifkan.");
          router.refresh();
        } else if (dialog === "close") {
          toast.success("Periode ditutup.");
          router.refresh();
        } else {
          toast.success("Periode dihapus.");
          router.push("/hrd/periode");
        }
        setDialog(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  const dialogProps =
    dialog === "activate"
      ? {
          title: "Aktifkan periode?",
          description: `Periode "${name}" akan diaktifkan dan KPI saat ini di-snapshot.`,
          confirmText: "Aktifkan",
        }
      : dialog === "close"
        ? {
            title: "Tutup periode?",
            description: `Periode "${name}" akan ditutup dan tidak dapat dibuka kembali.`,
            confirmText: "Tutup Periode",
          }
        : dialog === "delete"
          ? {
              title: "Hapus periode?",
              description: `Periode "${name}" akan dihapus permanen.`,
              confirmText: "Hapus",
            }
          : { title: "", description: undefined, confirmText: "Konfirmasi" };

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <>
          <Button variant="outline" asChild>
            <Link href={`/hrd/periode/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setDialog("delete")}>
            <Trash2 className="h-4 w-4" />
            Hapus
          </Button>
          <Button onClick={() => setDialog("activate")}>
            <CheckCircle2 className="h-4 w-4" />
            Aktifkan
          </Button>
        </>
      )}

      {status === "ACTIVE" && (
        <Button onClick={() => setDialog("close")}>
          <Lock className="h-4 w-4" />
          Tutup Periode
        </Button>
      )}

      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialogProps.title}
        description={dialogProps.description}
        confirmText={dialogProps.confirmText}
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
