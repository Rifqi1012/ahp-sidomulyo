import { getBranches } from "@/app/actions/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { DepartmentForm } from "@/components/admin/DepartmentForm";

export const dynamic = "force-dynamic";

export default async function NewDepartemenPage() {
  const branches = await getBranches();
  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Tambah Departemen"
        description="Tambahkan departemen baru ke sebuah cabang."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <DepartmentForm mode="create" branches={branchOptions} />
      </div>
    </div>
  );
}
