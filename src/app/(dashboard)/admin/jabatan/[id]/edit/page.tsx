import { notFound } from "next/navigation";

import { getJabatanById } from "@/app/actions/jabatan";
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

  const jabatan = await getJabatanById(id);
  if (!jabatan) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit Jabatan"
        description="Perbarui informasi jabatan. Role sistem tidak dapat diubah."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <JabatanForm
          mode="edit"
          jabatan={{
            id: jabatan.id,
            name: jabatan.name,
            level: jabatan.level,
            scope: jabatan.scope,
            roleSystem: jabatan.roleSystem,
            description: jabatan.description,
            isActive: jabatan.isActive,
          }}
        />
      </div>
    </div>
  );
}
