import { notFound } from "next/navigation";

import { AssessmentFormView } from "@/components/assessment/AssessmentFormView";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { assesseeId: string } }) {
  const id = Number(params.assesseeId);
  if (Number.isNaN(id)) notFound();
  return <AssessmentFormView assesseeId={id} basePath="/hrd" />;
}
