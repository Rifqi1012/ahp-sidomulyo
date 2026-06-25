import Link from "next/link";
import { Plus } from "lucide-react";

import { getBranches } from "@/app/actions/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { BranchTable } from "@/components/admin/BranchTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CabangPage() {
  const branches = await getBranches();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Kelola Cabang"
        description="Kelola data cabang perusahaan."
        action={
          <Button asChild>
            <Link href="/admin/cabang/new">
              <Plus className="h-4 w-4" />
              Tambah Cabang
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <BranchTable branches={branches} />
      </div>
    </div>
  );
}
