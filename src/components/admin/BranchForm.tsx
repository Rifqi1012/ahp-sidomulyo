"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  createBranch,
  updateBranch,
  type ActionResult,
} from "@/app/actions/branch";

type BranchFormProps = {
  mode: "create" | "edit";
  branch?: {
    id: number;
    name: string;
    address: string | null;
    isPusat: boolean;
    isActive: boolean;
  };
};

export function BranchForm({ mode, branch }: BranchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isPusat = branch?.isPusat ?? false;

  function handleResult(result: ActionResult, successMsg: string) {
    if (result.success) {
      toast.success(successMsg);
      router.push("/admin/cabang");
      router.refresh();
    } else {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      if (mode === "create") {
        const result = await createBranch({ name, address });
        handleResult(result, "Cabang berhasil ditambahkan.");
      } else if (branch) {
        const result = await updateBranch(branch.id, {
          name,
          address,
          isActive,
        });
        handleResult(result, "Cabang berhasil diperbarui.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isPusat && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <StatusBadge status="pusat" />
          <span>
            Ini adalah kantor pusat dan tidak dapat dinonaktifkan.
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nama Cabang</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Cabang Surabaya"
          disabled={isPending}
        />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Alamat lengkap cabang"
          disabled={isPending}
        />
      </div>

      {mode === "edit" && !isPusat && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Status Aktif</p>
            <p className="text-xs text-slate-500">
              Nonaktifkan untuk menyembunyikan cabang dari sistem.
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
          <Link href="/admin/cabang">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </form>
  );
}
