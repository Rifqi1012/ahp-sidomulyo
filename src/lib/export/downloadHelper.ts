import { saveAs } from "file-saver";

/** Unduh sebuah Blob dengan nama file tertentu. */
export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

/** Format tanggal untuk nama file: yyyymmdd. */
export function fileDateStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
