import { checkAndTransition, getCurrentCycle } from "@/app/actions/period";
import { PeriodCycleManager } from "@/components/hrd/PeriodCycleManager";

export const dynamic = "force-dynamic";

export default async function PeriodePage() {
  // Auto-transition: tutup periode yang sudah lewat & aktifkan berikutnya.
  await checkAndTransition();

  const cycle = await getCurrentCycle();

  return (
    <div className="mx-auto max-w-7xl">
      <PeriodCycleManager rows={cycle.rows} allClosed={cycle.allClosed} />
    </div>
  );
}
