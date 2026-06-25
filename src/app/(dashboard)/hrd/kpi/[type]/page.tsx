import { notFound } from "next/navigation";
import type { KpiType } from "@prisma/client";

import { getCurrentKpi } from "@/app/actions/kpi";
import { KpiEditor } from "@/components/forms/KpiEditor";

export const dynamic = "force-dynamic";

const META: Record<KpiType, { title: string; info: string }> = {
  atas: {
    title: "Setup KPI Jabatan Atas",
    info: "Digunakan untuk menilai Kepala Cabang dan Kepala Divisi.",
  },
  bawah: {
    title: "Setup KPI Jabatan Bawah",
    info: "Digunakan untuk menilai Karyawan.",
  },
};

export default async function KpiSetupPage({
  params,
}: {
  params: { type: string };
}) {
  if (params.type !== "atas" && params.type !== "bawah") notFound();
  const type = params.type as KpiType;

  const kpi = await getCurrentKpi(type);
  if (!kpi) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          KPI {type === "atas" ? "Atas" : "Bawah"} belum tersedia. Jalankan seed
          data terlebih dahulu.
        </div>
      </div>
    );
  }

  return (
    <KpiEditor
      key={kpi.version}
      type={type}
      title={META[type].title}
      info={META[type].info}
      kpi={kpi}
    />
  );
}
