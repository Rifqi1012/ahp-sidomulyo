import Link from "next/link";
import { Plus } from "lucide-react";

import { getJabatan } from "@/app/actions/jabatan";
import { PageHeader } from "@/components/shared/PageHeader";
import { JabatanTabs } from "@/components/admin/JabatanTabs";
import { JabatanTable } from "@/components/admin/JabatanTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function JabatanPage({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  const scope = searchParams.scope === "cabang" ? "cabang" : "pusat";
  const jabatan = await getJabatan(scope);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Kelola Jabatan"
        description="Kelola jabatan beserta level KPI dan role sistem."
        action={
          <Button asChild>
            <Link href="/admin/jabatan/new">
              <Plus className="h-4 w-4" />
              Tambah Jabatan
            </Link>
          </Button>
        }
      />

      <JabatanTabs active={scope} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <JabatanTable jabatan={jabatan} />
      </div>
    </div>
  );
}
