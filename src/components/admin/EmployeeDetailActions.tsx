"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { KeyRound, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { resetPassword } from "@/app/actions/employee";

type EmployeeDetailActionsProps = {
  employeeId: number;
  employeeName: string;
};

export function EmployeeDetailActions({
  employeeId,
  employeeName,
}: EmployeeDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleReset() {
    startTransition(async () => {
      const result = await resetPassword(employeeId);
      if (result.success) {
        toast.success('Password direset ke "password".');
      } else {
        toast.error(result.error);
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => setConfirmOpen(true)}>
        <KeyRound className="h-4 w-4" />
        Reset Password
      </Button>
      <Button asChild>
        <Link href={`/admin/karyawan/${employeeId}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset password karyawan?"
        description={`Password ${employeeName} akan direset menjadi "password".`}
        confirmText="Reset"
        loading={isPending}
        onConfirm={handleReset}
      />
    </div>
  );
}
