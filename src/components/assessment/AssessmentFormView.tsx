import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getOrCreateAssessment } from "@/app/actions/assessment";
import { AssessmentForm } from "@/components/assessment/AssessmentForm";
import { Button } from "@/components/ui/button";

export async function AssessmentFormView({
  assesseeId,
  basePath,
}: {
  assesseeId: number;
  basePath: string;
}) {
  const result = await getOrCreateAssessment(assesseeId);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {result.error}
        </div>
        <Button variant="outline" asChild>
          <Link href={`${basePath}/penilaian`}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
    );
  }

  return <AssessmentForm data={result.data} basePath={basePath} />;
}
