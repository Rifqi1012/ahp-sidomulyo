import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { AssessmentDetailData } from "@/app/actions/report";
import { toRoman } from "@/lib/period";
import {
  COLORS,
  fmtDate,
  finalY,
  drawHeader,
  drawInfoRows,
  drawSignatures,
} from "@/lib/pdf/shared";

export function buildKpiBawahPdf(data: AssessmentDetailData): {
  doc: jsPDF;
  filename: string;
} {
  const doc = new jsPDF("p", "mm", "a4");
  const margin = 15;

  drawHeader(doc, ["PENILAIAN KINERJA KARYAWAN", "PKK - 01", ""]);

  let y = 34;
  y = drawInfoRows(
    doc,
    [
      ["Nama", data.assessee.name],
      ["Jabatan", data.assessee.jabatanName],
      ["Tgl Masuk", fmtDate(data.assessee.hireDate)],
      [
        "Divisi/Bagian",
        `${data.assessee.departmentName} - ${data.assessee.branchName}`,
      ],
    ],
    [
      ["Evaluasi", "Tahunan"],
      [
        "Periode",
        `${fmtDate(data.period.startDate)} s/d ${fmtDate(data.period.endDate)}`,
      ],
    ],
    y,
  );
  y += 4;

  // Tabel per faktor.
  data.criteria.forEach((c, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `Faktor ${toRoman(i + 1)} — ${c.name} (${Math.round(c.bobotPercent)})`,
      margin,
      y,
    );
    y += 2;

    const head = [["No", "Nama", "Deskripsi", "Nilai (1-5)", "Bobot", "Nilai %"]];
    const body: (string | { content: string; colSpan?: number; styles?: object })[][] =
      c.subcriteria.map((s, j) => [
        String(j + 1),
        s.name,
        s.description,
        s.blended.toFixed(2),
        `×${Math.round(s.globalPercent)}%`,
        s.weightedScore.toFixed(3),
      ]);
    body.push([
      {
        content: `Total ${c.name}`,
        colSpan: 5,
        styles: { fontStyle: "bold", fillColor: COLORS.total },
      },
      {
        content: c.contribution.toFixed(3),
        styles: { fontStyle: "bold", fillColor: COLORS.total },
      },
    ]);

    autoTable(doc, {
      head,
      body,
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.5, lineColor: COLORS.border, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.header, textColor: 255, fontSize: 9, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 40 },
        2: { cellWidth: 70 },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 22, halign: "center" },
      },
    });
    y = finalY(doc) + 4;
  });

  // Ringkasan.
  const summaryBody: (string | { content: string; styles?: object })[][] =
    data.criteria.map((c, i) => [
      `Total ${c.name}`,
      c.contribution.toFixed(3),
    ]);
  summaryBody.push([
    { content: "PENILAIAN KESELURUHAN", styles: { fontStyle: "bold", fillColor: COLORS.total } },
    { content: data.finalScore.toFixed(3), styles: { fontStyle: "bold", fillColor: COLORS.total } },
  ]);
  summaryBody.push([
    { content: "KATEGORI", styles: { fontStyle: "bold", fillColor: COLORS.total } },
    { content: data.category, styles: { fontStyle: "bold", fillColor: COLORS.total } },
  ]);
  autoTable(doc, {
    body: summaryBody,
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, lineColor: COLORS.border, lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60, halign: "center" } },
  });
  y = finalY(doc) + 4;

  // Interpretasi hasil.
  autoTable(doc, {
    head: [["Interpretasi Hasil", ""]],
    body: [
      ["4.5 - 5.0", "Sangat Baik"],
      ["3.5 - 4.4", "Baik"],
      ["2.5 - 3.4", "Cukup"],
      ["1.5 - 2.4", "Kurang"],
      ["1.0 - 1.4", "Sangat Kurang"],
    ],
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: COLORS.border, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.header, textColor: 255, fontSize: 8, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 40, halign: "center" }, 1: { cellWidth: 140 } },
  });
  y = finalY(doc) + 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Komentar Penilai:", margin, y);
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y + 5, 195, y + 5);
  y += 11;
  doc.text("Komentar Karyawan:", margin, y);
  doc.line(margin, y + 5, 195, y + 5);
  y += 12;

  drawSignatures(
    doc,
    y,
    {
      title: "Penilai",
      name: data.penilai2?.name ?? data.penilai1?.name ?? "—",
      sub: data.penilai2?.jabatanName ?? data.penilai1?.jabatanName ?? "",
    },
    {
      title: "Yang Dinilai",
      name: data.assessee.name,
      sub: data.assessee.jabatanName,
    },
  );

  return {
    doc,
    filename: `KPI_Bawah_${data.assessee.name}_${data.period.name}.pdf`,
  };
}

export function generateKpiBawahPdf(data: AssessmentDetailData): void {
  const { doc, filename } = buildKpiBawahPdf(data);
  doc.save(filename);
}
