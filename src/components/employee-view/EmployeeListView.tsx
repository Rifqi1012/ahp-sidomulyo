import { EMPLOYEE_PAGE_SIZE } from "@/lib/constants";
import type { EmployeeViewResult } from "@/app/actions/employee";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import {
  EmployeeViewTable,
  type ViewVariant,
} from "@/components/employee-view/EmployeeViewTable";
import { EmployeeViewFilterBar } from "@/components/employee-view/EmployeeViewFilterBar";

type Option = { id: number; name: string };

export function EmployeeListView({
  variant,
  basePath,
  title,
  description,
  result,
  page,
  branches,
  fixedBranchId,
  fixedDepartmentId,
}: {
  variant: ViewVariant;
  basePath: string;
  title: string;
  description: string;
  result: EmployeeViewResult;
  page: number;
  branches?: Option[];
  fixedBranchId?: number;
  fixedDepartmentId?: number;
}) {
  const pageCount = Math.max(1, Math.ceil(result.total / EMPLOYEE_PAGE_SIZE));
  const rows = result.data.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    jabatanName: e.jabatan?.name ?? "—",
    departmentName: e.department?.name ?? "—",
    branchName: e.branch?.name ?? "—",
    role: e.role,
    isActive: e.isActive,
  }));

  return (
    <div className="mx-auto max-w-[88rem] space-y-6">
      <PageHeader title={title} description={description} />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <EmployeeViewFilterBar
          variant={variant}
          branches={branches}
          fixedBranchId={fixedBranchId}
          fixedDepartmentId={fixedDepartmentId}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmployeeViewTable
          variant={variant}
          rows={rows}
          basePath={basePath}
          startIndex={(page - 1) * EMPLOYEE_PAGE_SIZE}
        />
        <div className="border-t border-slate-200">
          <Pagination page={page} pageCount={pageCount} total={result.total} />
        </div>
      </div>
    </div>
  );
}
