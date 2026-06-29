"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAssessmentDetail } from "@/app/actions/report";

type ExportPdfButtonProps = {
  finalScoreId: number;
  assesseeName: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
};

export function ExportPdfButton({
  finalScoreId,
  assesseeName,
  size = "sm",
  variant = "outline",
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const data = await getAssessmentDetail(finalScoreId);
      if (!data) {
        toast.error("Data penilaian tidak ditemukan.");
        return;
      }
      const { generatePdf } = await import("@/lib/pdf");
      generatePdf(data);
      toast.success(`PDF ${assesseeName} berhasil dibuat.`);
    } catch {
      toast.error("Gagal membuat PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size={size} variant={variant} onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Export PDF
    </Button>
  );
}
