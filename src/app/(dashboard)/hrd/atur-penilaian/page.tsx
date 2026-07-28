import { getAssignments } from "@/app/actions/assignment";
import { AturPenilaianClient } from "@/components/penilaian/AturPenilaianClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initial = await getAssignments();
  return <AturPenilaianClient initial={initial} />;
}
