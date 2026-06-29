/**
 * Helper murni (tanpa akses DB) untuk periode penilaian.
 * Aman diimpor dari client maupun server.
 */

export const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const ROMAN_MAP: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  let num = Math.floor(n);
  let result = "";
  for (const [value, symbol] of ROMAN_MAP) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

/** Parse "yyyy-mm-dd" menjadi Date UTC midnight. */
export function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format Date menjadi "yyyy-mm-dd" (UTC). */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysUTC(date: Date, days: number): Date {
  const r = new Date(date);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

export function addMonthsUTC(date: Date, months: number): Date {
  const r = new Date(date);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

/** Deadline penilaian = tanggal mulai + 7 hari. */
export function computeDeadline(startDate: Date): Date {
  return addDaysUTC(startDate, 7);
}

/** Auto-suggest tanggal selesai = tanggal mulai + 3 bulan. */
export function suggestEndDate(startDate: Date): Date {
  return addMonthsUTC(startDate, 3);
}

/** Selisih hari (dibulatkan) antara dua tanggal. */
export function durationDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Selisih bulan kalender antara dua tanggal (UTC). */
export function monthsBetweenUTC(start: Date, end: Date): number {
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  if (end.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/** Label durasi: "3 bulan (90 hari)". */
export function durationLabel(start: Date, end: Date): string {
  const days = durationDays(start, end);
  const months = monthsBetweenUTC(start, end);
  return `${months} bulan (${days} hari)`;
}

/**
 * Bangun nama periode: "Periode [Romawi] — [Bulan] [Tahun]".
 *   buildPeriodName(2026-01-01, 1) -> "Periode I — Januari 2026"
 */
export function buildPeriodName(startDate: Date, order: number): string {
  const month = MONTHS_ID[startDate.getUTCMonth()];
  const year = startDate.getUTCFullYear();
  return `Periode ${toRoman(order)} — ${month} ${year}`;
}

/** Nama periode siklus: "Periode I 2026" (tahun dari tanggal mulai). */
export function simplePeriodName(order: number, year: number): string {
  return `Periode ${toRoman(order)} ${year}`;
}
