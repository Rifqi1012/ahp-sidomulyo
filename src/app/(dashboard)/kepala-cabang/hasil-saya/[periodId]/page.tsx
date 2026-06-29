import { notFound } from "next/navigation";

import { HasilPenilaianView } from "@/components/hasil-penilaian/HasilPenilaianView";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { periodId: string } }) {
  const id = Number(params.periodId);
  if (Number.isNaN(id)) notFound();
  return <HasilPenilaianView periodId={id} backHref="/kepala-cabang/hasil-saya" />;
}
