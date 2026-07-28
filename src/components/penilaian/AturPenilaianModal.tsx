"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { computeWeights } from "@/lib/assessorWeights";
import {
  getEligibleAssessors,
  saveAssignment,
  type AssignmentRow,
  type EligibleAssessor,
} from "@/app/actions/assignment";

const NONE = "none";

export function AturPenilaianModal({
  target,
  onClose,
  onSaved,
}: {
  target: AssignmentRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [assessors, setAssessors] = useState<EligibleAssessor[]>([]);
  const [p1, setP1] = useState<string>("");
  const [p2, setP2] = useState<string>(NONE);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!target) return;
    setP1(target.assessor1Id ? String(target.assessor1Id) : "");
    setP2(target.assessor2Id ? String(target.assessor2Id) : NONE);
    getEligibleAssessors(target.assesseeId).then(setAssessors);
  }, [target]);

  const byId = (id: string) => assessors.find((a) => String(a.id) === id);
  const r1 = byId(p1)?.role;
  const r2 = p2 !== NONE ? byId(p2)?.role : null;
  const weights = r1 ? computeWeights(r1, r2 ?? null) : null;
  const p2opts = assessors.filter((a) => String(a.id) !== p1);

  function submit(force = false) {
    if (!target) return;
    if (!p1) {
      toast.error("Penilai 1 wajib diisi.");
      return;
    }
    start(async () => {
      const res = await saveAssignment(
        {
          assesseeId: target.assesseeId,
          assessor1Id: Number(p1),
          assessor2Id: p2 !== NONE ? Number(p2) : null,
        },
        force,
      );
      if (res.ok) {
        toast.success("Penugasan penilaian disimpan.");
        onSaved();
        return;
      }
      if (res.needConfirm && window.confirm(`${res.error}\n\nLanjutkan?`)) {
        submit(true);
        return;
      }
      if (!res.needConfirm) toast.error(res.error);
    });
  }

  return (
    <Dialog open={target != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>Atur Penilaian — {target.name}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Jabatan: {target.jabatanName}</span>
              <span className="text-slate-300">|</span>
              <span>KPI:</span>
              <Badge variant={target.kpiType === "atas" ? "blue" : "orange"}>
                {target.kpiType === "atas" ? "KPI Pengawas" : "KPI Pelaksana"}
              </Badge>
            </div>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Penilai 1 <span className="text-red-500">(Wajib)</span>
                </label>
                <Select value={p1 || undefined} onValueChange={setP1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih penilai..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assessors.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} — {a.jabatanName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Penilai 2 <span className="text-slate-400">(Opsional)</span>
                </label>
                <Select value={p2} onValueChange={setP2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanpa penilai 2" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Tanpa penilai 2</SelectItem>
                    {p2opts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name} — {a.jabatanName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {weights && (
                <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs font-medium text-slate-500">
                    Preview Bobot (otomatis dari hierarki jabatan)
                  </p>
                  <div className="flex justify-between">
                    <span>
                      {byId(p1)?.name} ({byId(p1)?.jabatanName})
                    </span>
                    <span className="font-semibold text-blue-700">
                      {weights.weight1}%
                    </span>
                  </div>
                  {weights.weight2 != null && p2 !== NONE && (
                    <div className="flex justify-between">
                      <span>
                        {byId(p2)?.name} ({byId(p2)?.jabatanName})
                      </span>
                      <span className="font-semibold text-orange-700">
                        {weights.weight2}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={pending}>
                Batal
              </Button>
              <Button onClick={() => submit()} disabled={pending || !p1}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Penugasan
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
