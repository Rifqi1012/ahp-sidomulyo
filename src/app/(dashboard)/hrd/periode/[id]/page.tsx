import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getPeriod, getPeriodProgress } from "@/app/actions/period";
import { PageHeader } from "@/components/shared/PageHeader";
import { PeriodStatusBadge } from "@/components/hrd/PeriodStatusBadge";
import { PeriodDetailActions } from "@/components/hrd/PeriodDetailActions";
import { Countdown } from "@/components/shared/Countdown";
import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PeriodeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const period = await getPeriod(id);
  if (!period) notFound();

  const isActive = period.status === "ACTIVE";
  const progress = isActive ? await getPeriodProgress(id) : [];

  const infoRows = [
    { label: "Nama Periode", value: period.name },
    { label: "Tanggal Mulai", value: formatDateLong(period.startDate) },
    { label: "Tanggal Selesai", value: formatDateLong(period.endDate) },
    {
      label: "Deadline Penilaian",
      value: formatDateLong(period.deadlinePenilaian),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Detail Periode"
        description="Informasi dan progres periode penilaian."
        action={
          <PeriodDetailActions
            id={period.id}
            name={period.name}
            status={period.status}
          />
        }
      />

      {/* Status + countdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="text-sm text-slate-500">Status Periode</span>
            <div>
              <PeriodStatusBadge status={period.status} size="lg" />
            </div>
          </div>
          {isActive && (
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <Countdown deadline={period.deadlinePenilaian} />
            </div>
          )}
        </div>
      </div>

      {/* Info lengkap */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="divide-y divide-slate-100">
          {infoRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3"
            >
              <dt className="text-sm text-slate-500">{row.label}</dt>
              <dd className="text-sm font-medium text-slate-900 sm:col-span-2">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Progress penilaian (hanya ACTIVE) */}
      {isActive && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Progres Penilaian
          </h2>
          <div className="mt-4 space-y-4">
            {progress.map((row) => {
              const pct =
                row.total > 0
                  ? Math.round((row.done / row.total) * 100)
                  : 0;
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{row.label}</span>
                    <span className="font-medium text-slate-900">
                      {row.done}/{row.total} dinilai
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button variant="outline" asChild>
        <Link href="/hrd/periode">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar
        </Link>
      </Button>
    </div>
  );
}
