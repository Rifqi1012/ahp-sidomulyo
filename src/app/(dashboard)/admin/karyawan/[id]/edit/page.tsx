import { notFound } from "next/navigation";

import { getEmployee } from "@/app/actions/employee";
import { getBranches } from "@/app/actions/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmployeeForm } from "@/components/admin/EmployeeForm";

export const dynamic = "force-dynamic";

export default async function EditKaryawanPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const [employee, branches] = await Promise.all([
    getEmployee(id),
    getBranches(),
  ]);
  if (!employee) notFound();

  const branchOptions = branches
    .filter((b) => b.isActive || b.id === employee.branchId)
    .map((b) => ({ id: b.id, name: b.name, isPusat: b.isPusat }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Edit Karyawan"
        description="Perbarui data dan penempatan karyawan."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeForm
          mode="edit"
          branches={branchOptions}
          employee={{
            id: employee.id,
            name: employee.name,
            nik: employee.nik,
            hireDate: employee.hireDate
              ? employee.hireDate.toISOString().slice(0, 10)
              : null,
            branchId: employee.branchId,
            departmentId: employee.departmentId,
            jabatanId: employee.jabatanId,
            email: employee.email,
            isActive: employee.isActive,
          }}
        />
      </div>
    </div>
  );
}
