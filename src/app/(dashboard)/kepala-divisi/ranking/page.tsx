import { getAvailablePeriods, getReportBranches } from "@/app/actions/report";
import { RankingClient } from "@/components/laporan/RankingClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [periods, branches] = await Promise.all([
    getAvailablePeriods(),
    getReportBranches(),
  ]);
  return (
    <RankingClient
      role="kepala_divisi"
      basePath="/kepala-divisi"
      periods={periods}
      branches={branches}
    />
  );
}
