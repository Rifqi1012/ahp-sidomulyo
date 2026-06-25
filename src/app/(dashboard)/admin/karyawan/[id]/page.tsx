import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getEmployee } from "@/app/actions/employee";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmployeeDetailActions } from "@/components/admin/EmployeeDetailActions";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function KaryawanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const employee = await getEmployee(id);
  if (!employee) notFound();

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Nama Lengkap", value: employee.name },
    { label: "NIK", value: employee.nik || "—" },
    { label: "Email", value: employee.email },
    { label: "Role", value: roleLabel(employee.role) },
    { label: "Cabang", value: employee.branch?.name ?? "—" },
    { label: "Departemen", value: employee.department?.name ?? "—" },
    { label: "Jabatan", value: employee.jabatan?.name ?? "—" },
    { label: "Tanggal Masuk", value: formatDate(employee.hireDate) },
    {
      label: "Status",
      value: <StatusBadge status={employee.isActive ? "active" : "inactive"} />,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Detail Karyawan"
        description="Informasi lengkap karyawan."
        action={
          <EmployeeDetailActions
            employeeId={employee.id}
            employeeName={employee.name}
          />
        }
      />

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
        <Link href="/admin/karyawan">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar
        </Link>
      </Button>
    </div>
  );
}
