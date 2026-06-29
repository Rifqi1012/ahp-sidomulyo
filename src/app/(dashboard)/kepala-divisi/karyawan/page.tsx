import { getEmployeesForKd, type EmployeeViewResult } from "@/app/actions/employee";
import { getSessionUser } from "@/lib/auth-guard";
import { parseEmployeeViewFilter } from "@/lib/employeeViewFilter";
import { EmployeeListView } from "@/components/employee-view/EmployeeListView";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const user = await getSessionUser();
  const branchId = user?.branchId ?? -1;
  const departmentId = user?.departmentId ?? -1;
  const filter = parseEmployeeViewFilter(searchParams);

  const result: EmployeeViewResult =
    branchId > 0 && departmentId > 0
      ? await getEmployeesForKd(branchId, departmentId, filter)
      : { data: [], total: 0 };

  return (
    <EmployeeListView
      variant="kd"
      basePath="/kepala-divisi"
      title="Data Karyawan"
      description="Karyawan di divisi Anda (hanya lihat)."
      result={result}
      page={filter.page ?? 1}
      fixedBranchId={branchId > 0 ? branchId : undefined}
      fixedDepartmentId={departmentId > 0 ? departmentId : undefined}
    />
  );
}
