import JSZip from "jszip";

import { getAssessmentDetail } from "@/app/actions/report";
import { buildPdf } from "@/lib/pdf";

export type PdfZipEntry = {
  finalScoreId: number;
  name: string;
  periodName: string;
};

/**
 * Generate PDF per entry lalu kompres ke satu ZIP.
 * Nama file per PDF: "[Nama]_[Periode].pdf".
 */
export async function generatePdfZip(entries: PdfZipEntry[]): Promise<Blob> {
  const zip = new JSZip();

  for (const entry of entries) {
    const data = await getAssessmentDetail(entry.finalScoreId);
    if (!data) continue;
    const { doc } = buildPdf(data);
    const blob = doc.output("blob");
    const safeName = `${entry.name}_${entry.periodName}`.replace(
      /[^a-zA-Z0-9 _-]/g,
      "",
    );
    zip.file(`${safeName}.pdf`, blob);
  }

  return zip.generateAsync({ type: "blob" });
}
