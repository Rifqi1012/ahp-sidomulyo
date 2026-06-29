import { getBranches } from "@/app/actions/branch";
import { getDepartments } from "@/app/actions/department";
import { PageHeader } from "@/components/shared/PageHeader";
import { JabatanForm } from "@/components/admin/JabatanForm";

export const dynamic = "force-dynamic";

export default async function NewJabatanPage() {
  const [branches, departments] = await Promise.all([
    getBranches(),
    getDepartments(),
  ]);

  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name, isPusat: b.isPusat }));
  const deptOptions = departments
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, name: d.name, branchId: d.branchId }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Tambah Jabatan"
        description="Tambahkan jabatan baru yang terikat departemen & cabang."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <JabatanForm
          mode="create"
          branches={branchOptions}
          departments={deptOptions}
        />
      </div>
    </div>
  );
}
