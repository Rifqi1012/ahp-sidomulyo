import { getAvailablePeriods, getReportBranches } from "@/app/actions/report";
import { getSessionUser } from "@/lib/auth-guard";
import { LaporanClient } from "@/components/laporan/LaporanClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [periods, branches, user] = await Promise.all([
    getAvailablePeriods(),
    getReportBranches(),
    getSessionUser(),
  ]);
  const scopeLabel =
    branches.find((b) => b.id === user?.branchId)?.name ?? "Cabang";

  return (
    <LaporanClient
      role="kepala_cabang"
      basePath="/kepala-cabang"
      scopeLabel={scopeLabel}
      periods={periods}
      branches={[]}
    />
  );
}
