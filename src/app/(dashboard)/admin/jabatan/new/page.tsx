import { PageHeader } from "@/components/shared/PageHeader";
import { JabatanForm } from "@/components/admin/JabatanForm";

export default function NewJabatanPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Tambah Jabatan"
        description="Tambahkan jabatan baru ke dalam sistem."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <JabatanForm mode="create" />
      </div>
    </div>
  );
}
