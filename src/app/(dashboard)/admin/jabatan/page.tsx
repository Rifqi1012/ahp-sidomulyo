import Link from "next/link";
import { Plus } from "lucide-react";
import type { RoleType } from "@prisma/client";

import { getJabatan, type JabatanFilter } from "@/app/actions/jabatan";
import { getBranches } from "@/app/actions/branch";
import { ALL_ROLES } from "@/lib/labels";
import { PageHeader } from "@/components/shared/PageHeader";
import { JabatanFilters } from "@/components/admin/JabatanFilters";
import { JabatanTable } from "@/components/admin/JabatanTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function num(v?: string) {
  const n = v ? Number(v) : undefined;
  return n && !Number.isNaN(n) ? n : undefined;
}

export default async function JabatanPage({
  searchParams,
}: {
  searchParams: {
    branchId?: string;
    departmentId?: string;
    roleSystem?: string;
    status?: string;
  };
}) {
  const filter: JabatanFilter = {
    branchId: num(searchParams.branchId),
    departmentId: num(searchParams.departmentId),
    roleSystem:
      searchParams.roleSystem &&
      ALL_ROLES.includes(searchParams.roleSystem as RoleType)
        ? (searchParams.roleSystem as RoleType)
        : undefined,
    isActive:
      searchParams.status === "active"
        ? true
        : searchParams.status === "inactive"
          ? false
          : undefined,
  };

  const [jabatan, branches] = await Promise.all([
    getJabatan(filter),
    getBranches(),
  ]);
  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Kelola Jabatan"
        description="Kelola jabatan beserta departemen, cabang, level KPI, dan role sistem."
        action={
          <Button asChild>
            <Link href="/admin/jabatan/new">
              <Plus className="h-4 w-4" />
              Tambah Jabatan
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <JabatanFilters branches={branchOptions} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <JabatanTable jabatan={jabatan} />
      </div>
    </div>
  );
}
