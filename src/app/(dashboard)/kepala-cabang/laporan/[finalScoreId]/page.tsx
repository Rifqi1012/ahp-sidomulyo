import { notFound } from "next/navigation";

import { AssessmentDetailView } from "@/components/report/AssessmentDetailView";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { finalScoreId: string } }) {
  const id = Number(params.finalScoreId);
  if (Number.isNaN(id)) notFound();
  return <AssessmentDetailView finalScoreId={id} basePath="/kepala-cabang" />;
}
