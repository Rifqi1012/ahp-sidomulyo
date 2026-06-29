"use client";

import { FileSpreadsheet, FileArchive } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportToolbar({
  selectedCount,
  busy,
  onExportExcel,
  onExportPdfZip,
}: {
  selectedCount: number;
  busy: boolean;
  onExportExcel: () => void;
  onExportPdfZip: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <span className="text-sm font-medium text-blue-800">
        {selectedCount} karyawan dipilih
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onExportExcel}
          disabled={busy}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Pilihan: Excel
        </Button>
        <Button size="sm" onClick={onExportPdfZip} disabled={busy}>
          <FileArchive className="h-4 w-4" />
          Export Pilihan: PDF ZIP
        </Button>
      </div>
    </div>
  );
}
