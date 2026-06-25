import Link from "next/link";
import { UserPlus } from "lucide-react";

import { getEmployees, type EmployeeFilter } from "@/app/actions/employee";
import { getBranches } from "@/app/actions/branch";
import { getJabatan } from "@/app/actions/jabatan";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmployeeFilters } from "@/components/admin/EmployeeFilters";
import { EmployeeTable } from "@/components/admin/EmployeeTable";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function toNum(v?: string) {
  const n = v ? Number(v) : undefined;
  return n && !Number.isNaN(n) ? n : undefined;
}

export default async function KaryawanPage({
  searchParams,
}: {
  searchParams: {
    branchId?: string;
    departmentId?: string;
    jabatanId?: string;
    status?: string;
    page?: string;
  };
}) {
  const filter: EmployeeFilter = {
    branchId: toNum(searchParams.branchId),
    departmentId: toNum(searchParams.departmentId),
    jabatanId: toNum(searchParams.jabatanId),
    status:
      searchParams.status === "active"
        ? "active"
        : searchParams.status === "inactive"
          ? "inactive"
          : undefined,
    page: toNum(searchParams.page) ?? 1,
  };

  const [result, branches, jabatan] = await Promise.all([
    getEmployees(filter),
    getBranches(),
    getJabatan(),
  ]);

  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name }));
  const jabatanOptions = jabatan.map((j) => ({ id: j.id, name: j.name }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Kelola Karyawan"
        description="Kelola data karyawan dan akun sistem."
        action={
          <Button asChild>
            <Link href="/admin/karyawan/new">
              <UserPlus className="h-4 w-4" />
              Tambah Karyawan
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <EmployeeFilters branches={branchOptions} jabatan={jabatanOptions} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmployeeTable employees={result.items} />
        <div className="border-t border-slate-200">
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
          />
        </div>
      </div>
    </div>
  );
}
