"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { KpiLevel, RoleType, ScopeType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_ROLES, roleLabel } from "@/lib/labels";
import {
  createJabatan,
  updateJabatan,
  type ActionResult,
} from "@/app/actions/jabatan";

type JabatanFormProps = {
  mode: "create" | "edit";
  jabatan?: {
    id: number;
    name: string;
    level: KpiLevel | null;
    scope: ScopeType;
    roleSystem: RoleType;
    description: string | null;
    isActive: boolean;
  };
};

const LEVEL_NONE = "none";

export function JabatanForm({ mode, jabatan }: JabatanFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(jabatan?.name ?? "");
  const [level, setLevel] = useState<string>(jabatan?.level ?? LEVEL_NONE);
  const [scope, setScope] = useState<ScopeType>(jabatan?.scope ?? "pusat");
  const [roleSystem, setRoleSystem] = useState<string>(
    jabatan?.roleSystem ?? "",
  );
  const [description, setDescription] = useState(jabatan?.description ?? "");
  const [isActive, setIsActive] = useState(jabatan?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleResult(result: ActionResult, msg: string) {
    if (result.success) {
      toast.success(msg);
      router.push("/admin/jabatan");
      router.refresh();
    } else {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    const levelValue = (level === LEVEL_NONE ? null : level) as KpiLevel | null;

    startTransition(async () => {
      if (mode === "create") {
        if (!roleSystem) {
          setFieldErrors({ roleSystem: "Role sistem wajib dipilih." });
          toast.error("Role sistem wajib dipilih.");
          return;
        }
        const result = await createJabatan({
          name,
          level: levelValue,
          scope,
          roleSystem: roleSystem as RoleType,
          description,
        });
        handleResult(result, "Jabatan berhasil ditambahkan.");
      } else if (jabatan) {
        const result = await updateJabatan(jabatan.id, {
          name,
          level: levelValue,
          scope,
          description,
          isActive,
        });
        handleResult(result, "Jabatan berhasil diperbarui.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Jabatan</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Kepala Divisi"
          disabled={isPending}
        />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Level KPI</Label>
        <RadioGroup
          value={level}
          onValueChange={setLevel}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "atas", label: "Atas" },
            { value: "bawah", label: "Bawah" },
            { value: LEVEL_NONE, label: "Tidak Ada" },
          ].map((opt) => (
            <Label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 font-normal"
            >
              <RadioGroupItem value={opt.value} disabled={isPending} />
              {opt.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Berlaku Untuk</Label>
        <RadioGroup
          value={scope}
          onValueChange={(v) => setScope(v as ScopeType)}
          className="flex flex-wrap gap-4"
        >
          {[
            { value: "pusat", label: "Pusat" },
            { value: "cabang", label: "Cabang" },
            { value: "all", label: "Semua" },
          ].map((opt) => (
            <Label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 font-normal"
            >
              <RadioGroupItem value={opt.value} disabled={isPending} />
              {opt.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleSystem">Role Sistem</Label>
        {mode === "edit" ? (
          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
            {roleLabel(roleSystem)}
            <span className="ml-2 text-xs text-slate-400">
              (tidak dapat diubah)
            </span>
          </div>
        ) : (
          <>
            <Select
              value={roleSystem}
              onValueChange={setRoleSystem}
              disabled={isPending}
            >
              <SelectTrigger id="roleSystem">
                <SelectValue placeholder="Pilih role sistem" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.roleSystem && (
              <p className="text-sm text-destructive">
                {fieldErrors.roleSystem}
              </p>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi tugas/tanggung jawab jabatan"
          disabled={isPending}
        />
      </div>

      {mode === "edit" && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Status Aktif</p>
            <p className="text-xs text-slate-500">
              Nonaktifkan untuk menyembunyikan jabatan dari sistem.
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isPending}
          />
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan
        </Button>
        <Button type="button" variant="outline" asChild disabled={isPending}>
          <Link href="/admin/jabatan">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </form>
  );
}
