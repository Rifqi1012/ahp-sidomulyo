import Link from "next/link";
import { Plus } from "lucide-react";

import { getDepartments } from "@/app/actions/department";
import { getBranches } from "@/app/actions/branch";
import { PageHeader } from "@/components/shared/PageHeader";
import { DepartmentTable } from "@/components/admin/DepartmentTable";
import { BranchFilter } from "@/components/admin/BranchFilter";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DepartemenPage({
  searchParams,
}: {
  searchParams: { branchId?: string };
}) {
  const branchIdParam = searchParams.branchId;
  const branchId = branchIdParam ? Number(branchIdParam) : undefined;
  const validBranchId = branchId && !Number.isNaN(branchId) ? branchId : undefined;

  const [departments, branches] = await Promise.all([
    getDepartments(validBranchId),
    getBranches(),
  ]);

  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Kelola Departemen"
        description="Kelola departemen per cabang."
        action={
          <Button asChild>
            <Link href="/admin/departemen/new">
              <Plus className="h-4 w-4" />
              Tambah Departemen
            </Link>
          </Button>
        }
      />

      <div className="flex items-center justify-between">
        <BranchFilter branches={branchOptions} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DepartmentTable departments={departments} />
      </div>
    </div>
  );
}
