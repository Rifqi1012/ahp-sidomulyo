import type { jsPDF } from "jspdf";

import type { AssessmentDetailData } from "@/app/actions/report";
import {
  buildKpiAtasPdf,
  generateKpiAtasPdf,
} from "@/lib/pdf/generateKpiAtasPdf";
import {
  buildKpiBawahPdf,
  generateKpiBawahPdf,
} from "@/lib/pdf/generateKpiBawahPdf";

export type { AssessmentDetailData };

/** Bangun dokumen PDF (tanpa simpan) sesuai tipe KPI. */
export function buildPdf(data: AssessmentDetailData): {
  doc: jsPDF;
  filename: string;
} {
  return data.kpiType === "atas"
    ? buildKpiAtasPdf(data)
    : buildKpiBawahPdf(data);
}

/** Generate + langsung download PDF perorangan. */
export function generatePdf(data: AssessmentDetailData): void {
  if (data.kpiType === "atas") {
    generateKpiAtasPdf(data);
  } else {
    generateKpiBawahPdf(data);
  }
}
