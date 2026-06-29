import { getEmployeesForKc, type EmployeeViewResult } from "@/app/actions/employee";
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
  const filter = parseEmployeeViewFilter(searchParams);

  const result: EmployeeViewResult =
    branchId > 0
      ? await getEmployeesForKc(branchId, filter)
      : { data: [], total: 0 };

  return (
    <EmployeeListView
      variant="kc"
      basePath="/kepala-cabang"
      title="Data Karyawan"
      description="Karyawan di cabang Anda (hanya lihat)."
      result={result}
      page={filter.page ?? 1}
      fixedBranchId={branchId > 0 ? branchId : undefined}
    />
  );
}
