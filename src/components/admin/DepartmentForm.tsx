"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDepartment,
  updateDepartment,
  type ActionResult,
} from "@/app/actions/department";

type BranchOption = { id: number; name: string };

type DepartmentFormProps = {
  mode: "create" | "edit";
  branches: BranchOption[];
  department?: {
    id: number;
    branchId: number;
    name: string;
    isActive: boolean;
  };
};

export function DepartmentForm({
  mode,
  branches,
  department,
}: DepartmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [branchId, setBranchId] = useState<string>(
    department ? String(department.branchId) : "",
  );
  const [name, setName] = useState(department?.name ?? "");
  const [isActive, setIsActive] = useState(department?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleResult(result: ActionResult, successMsg: string) {
    if (result.success) {
      toast.success(successMsg);
      router.push("/admin/departemen");
      router.refresh();
    } else {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    const branchIdNum = Number(branchId);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createDepartment({ branchId: branchIdNum, name });
        handleResult(result, "Departemen berhasil ditambahkan.");
      } else if (department) {
        const result = await updateDepartment(department.id, {
          branchId: branchIdNum,
          name,
          isActive,
        });
        handleResult(result, "Departemen berhasil diperbarui.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="branchId">Cabang</Label>
        <Select
          value={branchId}
          onValueChange={setBranchId}
          disabled={isPending}
        >
          <SelectTrigger id="branchId">
            <SelectValue placeholder="Pilih cabang" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={String(branch.id)}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.branchId && (
          <p className="text-sm text-destructive">{fieldErrors.branchId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nama Departemen</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Finance & Accounting"
          disabled={isPending}
        />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      {mode === "edit" && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Status Aktif</p>
            <p className="text-xs text-slate-500">
              Nonaktifkan untuk menyembunyikan departemen dari sistem.
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isPending}
          />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan
        </Button>
        <Button type="button" variant="outline" asChild disabled={isPending}>
          <Link href="/admin/departemen">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </form>
  );
}
