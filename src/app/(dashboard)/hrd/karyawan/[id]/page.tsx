import { notFound } from "next/navigation";

import { getEmployeeDetail } from "@/app/actions/employee";
import { EmployeeDetailView } from "@/components/employee-view/EmployeeDetailView";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const employee = await getEmployeeDetail(id, "hrd");
  if (!employee) notFound();

  return <EmployeeDetailView employee={employee} basePath="/hrd" />;
}
