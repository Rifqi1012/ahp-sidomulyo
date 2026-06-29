import { notFound, redirect } from "next/navigation";

import { getEmployeeDetail } from "@/app/actions/employee";
import { getSessionUser } from "@/lib/auth-guard";
import { EmployeeDetailView } from "@/components/employee-view/EmployeeDetailView";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const user = await getSessionUser();
  const employee = await getEmployeeDetail(
    id,
    "kepala_cabang",
    user?.branchId ?? undefined,
  );
  if (!employee) redirect("/unauthorized");

  return <EmployeeDetailView employee={employee} basePath="/kepala-cabang" />;
}
