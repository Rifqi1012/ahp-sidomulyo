import { notFound, redirect } from "next/navigation";

import { getPeriod } from "@/app/actions/period";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodForm } from "@/components/hrd/PeriodForm";

export const dynamic = "force-dynamic";

function toInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function EditPeriodePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const period = await getPeriod(id);
  if (!period) notFound();

  // Hanya DRAFT yang dapat diedit.
  if (period.status !== "DRAFT") {
    redirect(`/hrd/periode/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Edit Periode"
        description="Perbarui periode penilaian (hanya untuk status Draft)."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PeriodForm
          mode="edit"
          period={{
            id: period.id,
            startDate: toInput(period.startDate),
            endDate: toInput(period.endDate),
            cycleOrder: period.cycleOrder,
          }}
        />
      </div>
    </div>
  );
}
