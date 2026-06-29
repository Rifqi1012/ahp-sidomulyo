import type { jsPDF } from "jspdf";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const COLORS = {
  header: [30, 58, 95] as [number, number, number], // #1e3a5f
  criteria: [232, 237, 242] as [number, number, number], // #e8edf2
  total: [240, 244, 248] as [number, number, number], // #f0f4f8
  border: [180, 190, 200] as [number, number, number],
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtDateTime(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = MONTHS[date.getMonth()];
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${dd} ${mm} ${yyyy}, ${hh}:${mi}`;
}

/** Y akhir tabel autotable terakhir. */
export function finalY(doc: jsPDF): number {
  // jspdf-autotable menyimpan posisi di lastAutoTable.
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
}

export function drawHeader(doc: jsPDF, lines: string[]): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(lines[0], 105, 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (lines[1]) doc.text(lines[1], 105, 22, { align: "center" });
  if (lines[2]) doc.text(lines[2], 105, 27, { align: "center" });
  doc.setDrawColor(...COLORS.border);
  doc.line(15, 30, 195, 30);
}

/** Dua kolom info label:value. Mengembalikan Y setelah blok. */
export function drawInfoRows(
  doc: jsPDF,
  left: [string, string][],
  right: [string, string][],
  startY: number,
): number {
  doc.setFontSize(8);
  const rows = Math.max(left.length, right.length);
  for (let i = 0; i < rows; i++) {
    const y = startY + i * 5;
    if (left[i]) {
      doc.setFont("helvetica", "normal");
      doc.text(`${left[i][0]}`, 15, y);
      doc.setFont("helvetica", "bold");
      doc.text(`: ${left[i][1]}`, 45, y);
    }
    if (right[i]) {
      doc.setFont("helvetica", "normal");
      doc.text(`${right[i][0]}`, 110, y);
      doc.setFont("helvetica", "bold");
      doc.text(`: ${right[i][1]}`, 140, y);
    }
  }
  doc.setFont("helvetica", "normal");
  return startY + rows * 5;
}

type SignBlock = { title: string; name: string; sub: string };

export function drawSignatures(
  doc: jsPDF,
  startY: number,
  left: SignBlock,
  right: SignBlock,
): void {
  let y = startY;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Dibuat oleh sistem pada: ${fmtDateTime(new Date())}`, 15, y);
  y += 8;

  const block = (x: number, b: SignBlock) => {
    doc.setFont("helvetica", "bold");
    doc.text(b.title, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(b.name, x, y + 22);
    doc.text(b.sub, x, y + 26);
    doc.text("Tanggal: ____________", x, y + 32);
  };
  block(15, left);
  block(110, right);
}
