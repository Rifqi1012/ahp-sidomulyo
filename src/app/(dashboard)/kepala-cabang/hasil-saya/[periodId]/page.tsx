import { notFound } from "next/navigation";

import { HasilDetail } from "@/components/assessment/HasilDetail";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { periodId: string } }) {
  const id = Number(params.periodId);
  if (Number.isNaN(id)) notFound();
  return <HasilDetail periodId={id} basePath="/kepala-cabang" />;
}
