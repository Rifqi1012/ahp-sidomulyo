import { notFound } from "next/navigation";

import { getBranch } from "@/app/actions/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { BranchForm } from "@/components/admin/BranchForm";

export const dynamic = "force-dynamic";

export default async function EditCabangPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const branch = await getBranch(id);
  if (!branch) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit Cabang"
        description="Perbarui informasi cabang."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <BranchForm
          mode="edit"
          branch={{
            id: branch.id,
            name: branch.name,
            address: branch.address,
            isPusat: branch.isPusat,
            isActive: branch.isActive,
          }}
        />
      </div>
    </div>
  );
}
