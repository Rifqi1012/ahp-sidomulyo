"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAssessmentDetail } from "@/app/actions/report";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ExportAllButton({ finalScoreIds }: { finalScoreIds: number[] }) {
  const [loading, setLoading] = useState(false);

  async function handleExportAll() {
    if (finalScoreIds.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }
    setLoading(true);
    try {
      const { generatePdf } = await import("@/lib/pdf");
      let count = 0;
      for (const id of finalScoreIds) {
        const data = await getAssessmentDetail(id);
        if (data) {
          generatePdf(data);
          count++;
          // Jeda agar browser tidak memblokir multiple download.
          await delay(400);
        }
      }
      toast.success(`${count} PDF berhasil dibuat.`);
    } catch {
      toast.error("Gagal mengekspor sebagian PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleExportAll} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Export Semua PDF
    </Button>
  );
}
