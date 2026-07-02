import { notFound } from "next/navigation";
import type { KpiType } from "@prisma/client";

import { getComparisons, getKpiStructure } from "@/app/actions/kpi";
import { AhpComparisonForm } from "@/components/kpi/AhpComparisonForm";

export const dynamic = "force-dynamic";

export default async function AhpPage({
  params,
}: {
  params: { type: string };
}) {
  if (params.type !== "atas" && params.type !== "bawah") notFound();
  const type = params.type as KpiType;

  const structure = await getKpiStructure(type);
  if (!structure) notFound();

  const criteria = await Promise.all(
    structure.criteria.map(async (c) => ({
      id: c.id,
      name: c.name,
      subcriteria: c.subcriteria.map((s) => ({ id: s.id, name: s.name })),
      comparisons: await getComparisons(c.id),
      status: c.ahpStatus,
    })),
  );

  return (
    <AhpComparisonForm
      key={structure.version}
      type={type}
      criteria={criteria}
    />
  );
}
