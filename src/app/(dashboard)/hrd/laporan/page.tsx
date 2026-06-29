import { getAvailablePeriods, getReportBranches } from "@/app/actions/report";
import { LaporanClient } from "@/components/laporan/LaporanClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [periods, branches] = await Promise.all([
    getAvailablePeriods(),
    getReportBranches(),
  ]);

  return (
    <LaporanClient
      role="hrd"
      basePath="/hrd"
      scopeLabel="HRD"
      periods={periods}
      branches={branches}
    />
  );
}
