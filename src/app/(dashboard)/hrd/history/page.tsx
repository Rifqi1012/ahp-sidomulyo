import { HistoryView } from "@/components/report/HistoryView";

export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams: {
    periodId?: string;
    branchId?: string;
    level?: string;
    search?: string;
    page?: string;
  };
}) {
  return <HistoryView basePath="/hrd" searchParams={searchParams} />;
}
