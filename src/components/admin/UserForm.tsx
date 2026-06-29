"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { RoleType } from "@prisma/client";

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
import { ASSIGNABLE_ROLES, roleLabel } from "@/lib/labels";
import { updateUser } from "@/app/actions/user";

type UserFormProps = {
  user: {
    id: number;
    name: string;
    email: string;
    role: RoleType;
    isActive: boolean;
  };
  isProtected?: boolean;
};

export function UserForm({ user, isProtected = false }: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<string>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateUser(user.id, {
        name,
        email,
        role: role as RoleType,
        isActive,
      });
      if (result.success) {
        toast.success("User berhasil diperbarui.");
        router.push("/admin/users");
        router.refresh();
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nama</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={150}
          disabled={isPending}
        />
        {fieldErrors.name && (
          <p className="text-sm text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending || isProtected}
        />
        <p className="text-xs text-slate-400">
          {isProtected
            ? "Email akun Admin utama tidak dapat diubah."
            : "Email digunakan untuk login ke sistem."}
        </p>
        {fieldErrors.email && (
          <p className="text-sm text-destructive">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={role}
          onValueChange={setRole}
          disabled={isPending || isProtected}
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Pilih role" />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-400">
          Role admin tidak tersedia untuk mencegah privilege escalation.
        </p>
        {fieldErrors.role && (
          <p className="text-sm text-destructive">{fieldErrors.role}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Status Aktif</p>
          <p className="text-xs text-slate-500">
            Nonaktifkan untuk mencabut akses login user.
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={isPending || isProtected}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan
        </Button>
        <Button type="button" variant="outline" asChild disabled={isPending}>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
    </form>
  );
}
