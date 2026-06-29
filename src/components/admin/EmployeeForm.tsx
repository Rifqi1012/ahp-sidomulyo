"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, User } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { roleLabel } from "@/lib/labels";
import { DEFAULT_PASSWORD } from "@/lib/constants";
import {
  createEmployee,
  updateEmployee,
} from "@/app/actions/employee";

type BranchOption = { id: number; name: string; isPusat: boolean };
type DeptOption = { id: number; name: string };
type JabatanOption = { id: number; name: string; roleSystem: string };

type EmployeeFormProps = {
  mode: "create" | "edit";
  branches: BranchOption[];
  employee?: {
    id: number;
    name: string;
    nik: string | null;
    hireDate: string | null; // yyyy-mm-dd
    branchId: number | null;
    departmentId: number | null;
    jabatanId: number | null;
    email: string;
    isActive: boolean;
  };
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export function EmployeeForm({ mode, branches, employee }: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(employee?.name ?? "");
  const [nik, setNik] = useState(employee?.nik ?? "");
  const [hireDate, setHireDate] = useState(
    employee?.hireDate ?? (mode === "create" ? todayStr() : ""),
  );
  const [branchId, setBranchId] = useState(
    employee?.branchId ? String(employee.branchId) : "",
  );
  const [departmentId, setDepartmentId] = useState(
    employee?.departmentId ? String(employee.departmentId) : "",
  );
  const [jabatanId, setJabatanId] = useState(
    employee?.jabatanId ? String(employee.jabatanId) : "",
  );
  const [isActive, setIsActive] = useState(employee?.isActive ?? true);

  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [jabatanList, setJabatanList] = useState<JabatanOption[]>([]);
  const [emailPreview, setEmailPreview] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [successOpen, setSuccessOpen] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");

  // Muat departemen sesuai cabang yang dipilih.
  useEffect(() => {
    if (!branchId) {
      setDepartments([]);
      return;
    }
    let active = true;
    fetch(`/api/internal/departments?branchId=${branchId}`)
      .then((r) => r.json())
      .then((d) => active && setDepartments(d.departments ?? []))
      .catch(() => active && setDepartments([]));
    return () => {
      active = false;
    };
  }, [branchId]);

  // Muat jabatan sesuai kombinasi cabang + departemen.
  useEffect(() => {
    if (!branchId || !departmentId) {
      setJabatanList([]);
      return;
    }
    let active = true;
    fetch(
      `/api/internal/jabatan?branchId=${branchId}&departmentId=${departmentId}`,
    )
      .then((r) => r.json())
      .then((d) => active && setJabatanList(d.jabatan ?? []))
      .catch(() => active && setJabatanList([]));
    return () => {
      active = false;
    };
  }, [branchId, departmentId]);

  // Realtime preview email (mode create) — debounce.
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (mode !== "create") return;
    const trimmed = name.trim();
    if (!trimmed) {
      setEmailPreview("");
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/internal/email-preview?name=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((d) => setEmailPreview(d.email ?? ""))
        .catch(() => setEmailPreview(""));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [name, mode]);

  function handleBranchChange(value: string) {
    setBranchId(value);
    setDepartmentId("");
    setJabatanId("");
  }

  const selectedRole = jabatanList.find(
    (j) => String(j.id) === jabatanId,
  )?.roleSystem;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    const payload = {
      name,
      nik: nik || null,
      hireDate: hireDate || null,
      branchId: Number(branchId),
      departmentId: Number(departmentId),
      jabatanId: Number(jabatanId),
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createEmployee(payload);
        if (result.success) {
          setCreatedEmail(result.email);
          setSuccessOpen(true);
        } else {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
        }
      } else if (employee) {
        const result = await updateEmployee(employee.id, {
          ...payload,
          isActive,
        });
        if (result.success) {
          toast.success("Data karyawan berhasil diperbarui.");
          router.push("/admin/karyawan");
          router.refresh();
        } else {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
        }
      }
    });
  }

  function copyAccountInfo() {
    const text = `Email: ${createdEmail}\nPassword: ${DEFAULT_PASSWORD}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Info akun disalin."))
      .catch(() => toast.error("Gagal menyalin."));
  }

  function closeSuccess() {
    setSuccessOpen(false);
    router.push("/admin/karyawan");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Section: Data Pribadi */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Data Pribadi</h2>
            <p className="text-xs text-slate-500">Informasi dasar karyawan.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              disabled={isPending}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nik">NIK (opsional)</Label>
              <Input
                id="nik"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                placeholder="Nomor induk karyawan"
                disabled={isPending}
              />
              {fieldErrors.nik && (
                <p className="text-sm text-destructive">{fieldErrors.nik}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hireDate">Tanggal Masuk Kerja</Label>
              <Input
                id="hireDate"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        </section>

        {/* Section: Penempatan */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Penempatan</h2>
            <p className="text-xs text-slate-500">
              Cabang, departemen, dan jabatan karyawan.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Cabang</Label>
            <Select
              value={branchId}
              onValueChange={handleBranchChange}
              disabled={isPending}
            >
              <SelectTrigger id="branchId">
                <SelectValue placeholder="Pilih cabang" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.branchId && (
              <p className="text-sm text-destructive">{fieldErrors.branchId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="departmentId">Departemen</Label>
              <Select
                value={departmentId}
                onValueChange={(v) => {
                  setDepartmentId(v);
                  setJabatanId("");
                }}
                disabled={isPending || !branchId}
              >
                <SelectTrigger id="departmentId">
                  <SelectValue placeholder="Pilih departemen" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.departmentId && (
                <p className="text-sm text-destructive">
                  {fieldErrors.departmentId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jabatanId">Jabatan</Label>
              <Select
                value={jabatanId}
                onValueChange={setJabatanId}
                disabled={isPending || !branchId || !departmentId}
              >
                <SelectTrigger id="jabatanId">
                  <SelectValue placeholder="Pilih jabatan" />
                </SelectTrigger>
                <SelectContent>
                  {jabatanList.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.jabatanId && (
                <p className="text-sm text-destructive">
                  {fieldErrors.jabatanId}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Preview Akun (create) atau Email (edit) */}
        {mode === "create" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <User className="h-4 w-4 text-blue-500" />
              Preview Akun yang akan dibuat
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="w-24 text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">
                  {emailPreview || "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-slate-500">Password</dt>
                <dd className="font-medium text-slate-900">
                  {DEFAULT_PASSWORD}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-slate-500">Role</dt>
                <dd className="font-medium text-slate-900">
                  {selectedRole ? roleLabel(selectedRole) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <span className="text-slate-500">Email akun: </span>
            <span className="font-medium text-slate-900">
              {employee?.email}
            </span>
          </div>
        )}

        {mode === "edit" && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Status Aktif</p>
              <p className="text-xs text-slate-500">
                Nonaktifkan untuk menonaktifkan akun karyawan.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </Button>
          <Button type="button" variant="outline" asChild disabled={isPending}>
            <Link href="/admin/karyawan">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        </div>
      </form>

      {/* Dialog info akun setelah sukses */}
      <Dialog open={successOpen} onOpenChange={(o) => !o && closeSuccess()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Karyawan berhasil ditambahkan</DialogTitle>
            <DialogDescription>
              Simpan informasi akun berikut untuk diberikan ke karyawan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex gap-2">
              <span className="w-20 text-slate-500">Email</span>
              <span className="font-medium text-slate-900">{createdEmail}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-20 text-slate-500">Password</span>
              <span className="font-medium text-slate-900">
                {DEFAULT_PASSWORD}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={copyAccountInfo}>
              <Copy className="h-4 w-4" />
              Salin Info
            </Button>
            <Button onClick={closeSuccess}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
