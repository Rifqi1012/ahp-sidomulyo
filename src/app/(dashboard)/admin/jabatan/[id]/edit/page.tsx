import { notFound } from "next/navigation";

import { getJabatanById } from "@/app/actions/jabatan";
import { getBranches } from "@/app/actions/branch";
import { getDepartments } from "@/app/actions/department";
import { PageHeader } from "@/components/shared/PageHeader";
import { JabatanForm } from "@/components/admin/JabatanForm";

export const dynamic = "force-dynamic";

export default async function EditJabatanPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const [jabatan, branches, departments] = await Promise.all([
    getJabatanById(id),
    getBranches(),
    getDepartments(),
  ]);
  if (!jabatan) notFound();

  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name, isPusat: b.isPusat }));
  const deptOptions = departments
    .filter((d) => d.isActive || d.id === jabatan.departmentId)
    .map((d) => ({ id: d.id, name: d.name, branchId: d.branchId }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit Jabatan"
        description="Perbarui informasi jabatan. Role sistem tidak dapat diubah."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <JabatanForm
          mode="edit"
          branches={branchOptions}
          departments={deptOptions}
          jabatan={{
            id: jabatan.id,
            name: jabatan.name,
            departmentId: jabatan.departmentId,
            branchId: jabatan.branchId,
            level: jabatan.level,
            roleSystem: jabatan.roleSystem,
            description: jabatan.description,
            isActive: jabatan.isActive,
          }}
        />
      </div>
    </div>
  );
}
