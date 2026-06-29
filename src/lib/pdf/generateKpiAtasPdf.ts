import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { AssessmentDetailData } from "@/app/actions/report";
import {
  COLORS,
  LETTERS,
  fmtDate,
  finalY,
  drawHeader,
  drawInfoRows,
  drawSignatures,
} from "@/lib/pdf/shared";

export function buildKpiAtasPdf(data: AssessmentDetailData): {
  doc: jsPDF;
  filename: string;
} {
  const doc = new jsPDF("p", "mm", "a4");
  const margin = 15;

  drawHeader(doc, [
    "PENILAIAN KINERJA KARYAWAN",
    `Key Performance Indicators (KPI) ${new Date(data.period.startDate).getUTCFullYear()}`,
    "PT Sidomulyo Selaras TBK",
  ]);

  let y = 34;
  y = drawInfoRows(
    doc,
    [
      ["Nama Karyawan", data.assessee.name],
      ["Jabatan", data.assessee.jabatanName],
      ["Departemen", `${data.assessee.departmentName} — ${data.assessee.branchName}`],
      ["Periode", data.period.name],
    ],
    [
      [
        "Penilai 1",
        data.penilai1
          ? `${data.penilai1.name} (${data.penilai1.jabatanName})`
          : "—",
      ],
      [
        "Penilai 2",
        data.penilai2
          ? `${data.penilai2.name} (${data.penilai2.jabatanName})`
          : "—",
      ],
      ["Tgl Penilaian", fmtDate(data.submittedAt)],
      ["Status", data.isComplete ? "Lengkap" : "Belum Lengkap"],
    ],
    y,
  );

  y += 4;

  // Tabel per kriteria.
  data.criteria.forEach((c, i) => {
    const letter = LETTERS[i];
    const head = [
      ["Area Kinerja", "Bobot", "Indikator Kerja", "Penilai 1", "Penilai 2 (Final)", "Nilai"],
    ];
    const body: (
      | string
      | { content: string; colSpan?: number; styles?: object }
    )[][] = [];

    // Baris kriteria.
    body.push([
      { content: `${letter}. ${c.name.toUpperCase()}`, styles: { fontStyle: "bold", fillColor: COLORS.criteria } },
      { content: `${Math.round(c.bobotPercent)}%`, styles: { fillColor: COLORS.criteria } },
      { content: "", styles: { fillColor: COLORS.criteria } },
      { content: "", styles: { fillColor: COLORS.criteria } },
      { content: "", styles: { fillColor: COLORS.criteria } },
      { content: "", styles: { fillColor: COLORS.criteria } },
    ]);

    // Baris subkriteria.
    for (const s of c.subcriteria) {
      body.push([
        "",
        `${Math.round(s.withinPercent)}%`,
        `${s.name}\n${s.description}`,
        s.p1Score != null ? String(s.p1Score) : "-",
        s.p2Score != null ? String(s.p2Score) : "-",
        s.blended.toFixed(2),
      ]);
    }

    // Baris total.
    body.push([
      { content: `Total Nilai ${letter}`, colSpan: 5, styles: { fontStyle: "bold", fillColor: COLORS.total } },
      { content: c.criteriaTotal.toFixed(2), styles: { fontStyle: "bold", fillColor: COLORS.total } },
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
        0: { cellWidth: 32 },
        1: { cellWidth: 14, halign: "center" },
        2: { cellWidth: 76 },
        3: { cellWidth: 16, halign: "center" },
        4: { cellWidth: 24, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
      },
    });
    y = finalY(doc) + 3;
  });

  // Ringkasan.
  const summaryBody: (string | { content: string; styles?: object })[][] =
    data.criteria.map((c, i) => [
      `Total Nilai ${LETTERS[i]} (${c.name})`,
      c.criteriaTotal.toFixed(2),
    ]);
  summaryBody.push([
    { content: "NILAI AKHIR", styles: { fontStyle: "bold", fillColor: COLORS.total } },
    { content: data.finalScore.toFixed(2), styles: { fontStyle: "bold", fillColor: COLORS.total } },
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

  // Formula.
  const formulaParts = data.criteria.map(
    (c, i) =>
      `(${c.criteriaTotal.toFixed(2)} × ${Math.round(c.bobotPercent)}%)`,
  );
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Nilai Akhir = " + formulaParts.join(" + "), margin, y);
  doc.text(`           = ${data.finalScore.toFixed(2)}`, margin, y + 4);
  y += 12;

  drawSignatures(
    doc,
    y,
    {
      title: "Penilai 1",
      name: data.penilai1?.name ?? "—",
      sub: data.penilai1?.jabatanName ?? "",
    },
    {
      title: "Penilai 2",
      name: data.penilai2?.name ?? "—",
      sub: data.penilai2?.jabatanName ?? "",
    },
  );

  return {
    doc,
    filename: `KPI_Atas_${data.assessee.name}_${data.period.name}.pdf`,
  };
}

export function generateKpiAtasPdf(data: AssessmentDetailData): void {
  const { doc, filename } = buildKpiAtasPdf(data);
  doc.save(filename);
}
