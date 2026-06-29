import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { getActiveResultTarget } from "@/app/actions/report";

export async function HasilSayaIndex({ basePath }: { basePath: string }) {
  const { periodId, hasActivePeriod } = await getActiveResultTarget();
  if (periodId) redirect(`${basePath}/hasil-saya/${periodId}`);

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <ClipboardList className="h-12 w-12 text-slate-300" />
        <p className="text-base font-semibold text-slate-800">
          {hasActivePeriod
            ? "Hasil Belum Tersedia"
            : "Tidak Ada Periode Aktif"}
        </p>
        <p className="max-w-sm text-sm text-slate-500">
          {hasActivePeriod
            ? "Penilaian Anda di periode aktif belum dimulai. Hasil akan muncul setelah penilai mulai menilai."
            : "Hasil penilaian akan muncul saat periode penilaian sedang berlangsung."}
        </p>
      </div>
    </div>
  );
}
