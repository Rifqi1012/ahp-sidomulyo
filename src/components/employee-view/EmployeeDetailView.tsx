import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { EmployeeWithRelations } from "@/app/actions/employee";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/labels";
import { formatDateLong } from "@/lib/format";

export function EmployeeDetailView({
  employee,
  basePath,
  showRole = true,
}: {
  employee: EmployeeWithRelations;
  basePath: string;
  showRole?: boolean;
}) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Nama Lengkap", value: employee.name },
    { label: "NIK", value: employee.nik || "—" },
    { label: "Email", value: employee.email },
    { label: "Jabatan", value: employee.jabatan?.name ?? "—" },
    { label: "Departemen", value: employee.department?.name ?? "—" },
    { label: "Cabang", value: employee.branch?.name ?? "—" },
    ...(showRole
      ? [{ label: "Role Sistem", value: roleLabel(employee.role) }]
      : []),
    { label: "Tanggal Bergabung", value: formatDateLong(employee.hireDate) },
    {
      label: "Status",
      value: <StatusBadge status={employee.isActive ? "active" : "inactive"} />,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Detail Karyawan" description="Informasi karyawan (hanya lihat)." />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3"
            >
              <dt className="text-sm text-slate-500">{row.label}</dt>
              <dd className="text-sm font-medium text-slate-900 sm:col-span-2">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Button variant="outline" asChild>
        <Link href={`${basePath}/karyawan`}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </Button>
    </div>
  );
}
