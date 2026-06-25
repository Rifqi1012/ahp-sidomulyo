import { PageHeader } from "@/components/shared/PageHeader";
import { BranchForm } from "@/components/admin/BranchForm";

export default function NewCabangPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Tambah Cabang"
        description="Tambahkan cabang baru ke dalam sistem."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <BranchForm mode="create" />
      </div>
    </div>
  );
}
