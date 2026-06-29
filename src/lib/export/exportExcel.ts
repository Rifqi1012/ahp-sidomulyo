import * as XLSX from "xlsx-js-style";

import type { PeriodOption, RekapRow } from "@/app/actions/report";

const BLUE = "1E3A5F";
const YELLOW = "FFD700";

const thin = { style: "thin", color: { rgb: "B4BEC8" } };
const borderAll = { top: thin, bottom: thin, left: thin, right: thin };

type Style = NonNullable<XLSX.CellObject["s"]>;

const headerStyle: Style = {
  fill: { fgColor: { rgb: BLUE } },
  font: { color: { rgb: "FFFFFF" }, bold: true },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: borderAll,
};
const finalStyle: Style = {
  fill: { fgColor: { rgb: YELLOW } },
  font: { color: { rgb: "000000" }, bold: true },
  alignment: { horizontal: "center" },
  border: borderAll,
};
const cellStyle: Style = {
  alignment: { horizontal: "center" },
  border: borderAll,
};
const textStyle: Style = { border: borderAll };

/** Kriteria (terurut) untuk sebuah periode, diambil dari baris dengan kriteria terbanyak. */
function periodCriteria(data: RekapRow[], periodId: number): string[] {
  let best: string[] = [];
  for (const row of data) {
    const ps = row.periodeScores.find((p) => p.periodId === periodId);
    if (ps && ps.kriteriaScores.length > best.length) {
      best = ps.kriteriaScores.map((k) => k.criteriaName);
    }
  }
  return best;
}

/** Bangun file Excel rekap (1 sheet sesuai tab) dan kembalikan Blob. */
export function generateRekapExcel(
  data: RekapRow[],
  periods: PeriodOption[],
  type: "atas" | "bawah",
): Blob {
  const fixed = ["NO", "ID", "NAMA", "JABATAN", "CABANG"];
  const critByPeriod = new Map<number, string[]>(
    periods.map((p) => [p.id, periodCriteria(data, p.id)]),
  );

  // Baris header 1 (grup periode) & header 2 (kolom).
  const row0: string[] = [...fixed.map(() => "")];
  const row1: string[] = [...fixed];
  const merges: XLSX.Range[] = [];

  // Merge kolom fixed secara vertikal (baris 0-1).
  fixed.forEach((label, i) => {
    row0[i] = label;
    merges.push({ s: { r: 0, c: i }, e: { r: 1, c: i } });
  });

  let col = fixed.length;
  for (const p of periods) {
    const crits = critByPeriod.get(p.id) ?? [];
    const span = crits.length + 1; // + NILAI AKHIR
    row0.push(p.name);
    for (let i = 1; i < span; i++) row0.push("");
    merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + span - 1 } });
    crits.forEach((c) => row1.push(c.toUpperCase()));
    row1.push("NILAI AKHIR");
    col += span;
  }

  const aoa: (string | number)[][] = [row0, row1];

  // Data.
  data.forEach((row, idx) => {
    const r: (string | number)[] = [
      idx + 1,
      row.nik,
      row.name,
      row.jabatan,
      row.cabang,
    ];
    for (const p of periods) {
      const crits = critByPeriod.get(p.id) ?? [];
      const ps = row.periodeScores.find((x) => x.periodId === p.id);
      for (const cname of crits) {
        const cs = ps?.kriteriaScores.find((k) => k.criteriaName === cname);
        r.push(cs ? Number(cs.totalScore.toFixed(3)) : "—");
      }
      r.push(
        ps?.finalScore != null ? Number(ps.finalScore.toFixed(2)) : "—",
      );
    }
    aoa.push(r);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;

  // Lebar kolom.
  const cols: XLSX.ColInfo[] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 26 },
    { wch: 20 },
    { wch: 16 },
  ];
  for (let c = fixed.length; c < row1.length; c++) cols.push({ wch: 13 });
  ws["!cols"] = cols;

  // Index kolom NILAI AKHIR (untuk highlight kuning).
  const finalCols = new Set<number>();
  let c2 = fixed.length;
  for (const p of periods) {
    const span = (critByPeriod.get(p.id) ?? []).length + 1;
    finalCols.add(c2 + span - 1);
    c2 += span;
  }

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (!cell) continue;
      if (R <= 1) {
        cell.s = headerStyle;
      } else if (finalCols.has(C)) {
        cell.s = finalStyle;
      } else if (C < fixed.length) {
        cell.s = C === 0 ? cellStyle : textStyle;
      } else {
        cell.s = cellStyle;
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    ws,
    type === "atas" ? "Jabatan Atas" : "Jabatan Bawah",
  );

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
