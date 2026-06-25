import { getBranches } from "@/app/actions/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmployeeForm } from "@/components/admin/EmployeeForm";

export const dynamic = "force-dynamic";

export default async function NewKaryawanPage() {
  const branches = await getBranches();
  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name, isPusat: b.isPusat }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Tambah Karyawan"
        description="Akun akan dibuat otomatis dari nama karyawan."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeForm mode="create" branches={branchOptions} />
      </div>
    </div>
  );
}
