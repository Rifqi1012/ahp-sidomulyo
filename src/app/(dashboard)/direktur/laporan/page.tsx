import { LaporanView } from "@/components/report/LaporanView";

export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams: { periodId?: string };
}) {
  const periodId = searchParams.periodId
    ? Number(searchParams.periodId)
    : undefined;
  return (
    <LaporanView
      basePath="/direktur"
      periodId={periodId && !Number.isNaN(periodId) ? periodId : undefined}
    />
  );
}
