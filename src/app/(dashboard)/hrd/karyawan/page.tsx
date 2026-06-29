import { getEmployeesForHrd } from "@/app/actions/employee";
import { getBranches } from "@/app/actions/branch";
import { parseEmployeeViewFilter } from "@/lib/employeeViewFilter";
import { EmployeeListView } from "@/components/employee-view/EmployeeListView";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filter = parseEmployeeViewFilter(searchParams);
  const [result, branches] = await Promise.all([
    getEmployeesForHrd(filter),
    getBranches(),
  ]);
  const branchOptions = branches
    .filter((b) => b.isActive)
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <EmployeeListView
      variant="hrd"
      basePath="/hrd"
      title="Data Karyawan"
      description="Lihat seluruh data karyawan (hanya lihat)."
      result={result}
      page={filter.page ?? 1}
      branches={branchOptions}
    />
  );
}
