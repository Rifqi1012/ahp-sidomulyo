import { notFound } from "next/navigation";

import { getDepartment } from "@/app/actions/department";
import { getBranches } from "@/app/actions/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { DepartmentForm } from "@/components/admin/DepartmentForm";

export const dynamic = "force-dynamic";

export default async function EditDepartemenPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const [department, branches] = await Promise.all([
    getDepartment(id),
    getBranches(),
  ]);
  if (!department) notFound();

  // Cabang aktif + cabang departemen ini (agar tetap muncul walau nonaktif).
  const branchOptions = branches
    .filter((b) => b.isActive || b.id === department.branchId)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit Departemen"
        description="Perbarui informasi departemen."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <DepartmentForm
          mode="edit"
          branches={branchOptions}
          department={{
            id: department.id,
            branchId: department.branchId,
            name: department.name,
            isActive: department.isActive,
          }}
        />
      </div>
    </div>
  );
}
