"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { KpiType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { KpiStepper } from "@/components/kpi/KpiStepper";
import { formatDate } from "@/lib/format";
import {
  addCriteria,
  addSubcriteria,
  deleteCriteria,
  deleteSubcriteria,
  updateCriteria,
  updateSubcriteria,
  type KpiStructure,
} from "@/app/actions/kpi";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function StatusBadge({
  status,
  cr,
}: {
  status: "empty" | "inconsistent" | "consistent";
  cr: number | null;
}) {
  if (status === "consistent")
    return (
      <Badge variant="green">
        ✅ Konsisten{cr != null ? ` (CR: ${cr.toFixed(2)})` : ""}
      </Badge>
    );
  if (status === "inconsistent")
    return <Badge variant="red">Tidak Konsisten</Badge>;
  return <Badge variant="slate">Belum diisi</Badge>;
}

export function KpiEditor({
  type,
  title,
  info,
  structure,
}: {
  type: KpiType;
  title: string;
  info: string;
  structure: KpiStructure;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const criteria = structure.criteria;

  // UI state
  const [addingCrit, setAddingCrit] = useState(false);
  const [newCritName, setNewCritName] = useState("");
  const [editCritId, setEditCritId] = useState<number | null>(null);
  const [editCritName, setEditCritName] = useState("");
  const [addSubFor, setAddSubFor] = useState<number | null>(null);
  const [newSub, setNewSub] = useState({ name: "", description: "" });
  const [editSubId, setEditSubId] = useState<number | null>(null);
  const [editSub, setEditSub] = useState({ name: "", description: "" });
  const [del, setDel] = useState<
    | { kind: "crit"; id: number; name: string }
    | { kind: "sub"; id: number; name: string }
    | null
  >(null);

  function run(p: Promise<{ success: boolean; error?: string }>, ok?: string) {
    startTransition(async () => {
      const r = await p;
      if (r.success) {
        if (ok) toast.success(ok);
        router.refresh();
      } else toast.error(r.error ?? "Gagal.");
    });
  }

  const hasInconsistent = criteria.some((c) => c.ahpStatus === "inconsistent");
  const canContinue =
    criteria.length > 0 && criteria.every((c) => c.subcriteria.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{info}</p>
          <Badge variant="slate">
            Versi {structure.version} — {formatDate(structure.createdAt)}
          </Badge>
        </div>
        <Button asChild disabled={!canContinue}>
          <Link
            href={canContinue ? `/hrd/kpi/${type}/ahp` : "#"}
            aria-disabled={!canContinue}
            className={!canContinue ? "pointer-events-none opacity-50" : ""}
          >
            Lanjut ke Perbandingan AHP
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <KpiStepper type={type} active={1} />

      {hasInconsistent && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Terdapat kriteria yang tidak konsisten. Selesaikan perbandingan AHP
          sebelum melanjutkan.
        </div>
      )}

      {/* Kriteria */}
      <div className="space-y-5">
        {criteria.map((c, i) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              {editCritId === c.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editCritName}
                    onChange={(e) => setEditCritName(e.target.value)}
                    className="h-9 max-w-sm"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      run(updateCriteria(c.id, editCritName), "Kriteria diperbarui.");
                      setEditCritId(null);
                    }}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditCritId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-slate-900">
                    {LETTERS[i]}. {c.name}
                  </h2>
                  <StatusBadge status={c.ahpStatus} cr={c.cr} />
                </div>
              )}
              {editCritId !== c.id && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditCritId(c.id);
                      setEditCritName(c.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDel({ kind: "crit", id: c.id, name: c.name })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Sub-kriteria
              </p>
              {c.subcriteria.length === 0 && (
                <p className="text-sm text-slate-400">Belum ada subkriteria.</p>
              )}
              {c.subcriteria.map((s) =>
                editSubId === s.id ? (
                  <div
                    key={s.id}
                    className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <Input
                      value={editSub.name}
                      onChange={(e) => setEditSub((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Nama subkriteria"
                      className="h-9"
                    />
                    <Textarea
                      value={editSub.description}
                      onChange={(e) =>
                        setEditSub((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="Deskripsi"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditSubId(null)}>
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          run(updateSubcriteria(s.id, editSub), "Subkriteria diperbarui.");
                          setEditSubId(null);
                        }}
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{s.name}</p>
                        {s.ahpWeight != null ? (
                          <span className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
                            Bobot: {s.ahpWeight.toFixed(4)}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-500">
                            Belum dihitung
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditSubId(s.id);
                          setEditSub({ name: s.name, description: s.description });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDel({ kind: "sub", id: s.id, name: s.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ),
              )}

              {addSubFor === c.id ? (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Input
                    value={newSub.name}
                    onChange={(e) => setNewSub((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nama subkriteria"
                    className="h-9"
                    autoFocus
                  />
                  <Textarea
                    value={newSub.description}
                    onChange={(e) =>
                      setNewSub((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Deskripsi"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddSubFor(null);
                        setNewSub({ name: "", description: "" });
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        run(addSubcriteria(c.id, newSub), "Subkriteria ditambahkan.");
                        setAddSubFor(null);
                        setNewSub({ name: "", description: "" });
                      }}
                    >
                      Simpan
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => {
                    setAddSubFor(c.id);
                    setNewSub({ name: "", description: "" });
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Tambah Subkriteria
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tambah kriteria */}
      {addingCrit ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Label>Nama Kriteria</Label>
          <Input
            value={newCritName}
            onChange={(e) => setNewCritName(e.target.value)}
            placeholder="Contoh: Faktor Efisiensi"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddingCrit(false);
                setNewCritName("");
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                run(addCriteria(type, newCritName), "Kriteria ditambahkan.");
                setAddingCrit(false);
                setNewCritName("");
              }}
            >
              Simpan Kriteria
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAddingCrit(true)} disabled={isPending}>
          <Plus className="h-4 w-4" />
          Tambah Kriteria
        </Button>
      )}

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={del?.kind === "crit" ? "Hapus kriteria?" : "Hapus subkriteria?"}
        description={
          del?.kind === "crit"
            ? `Menghapus kriteria "${del.name}" akan menghapus semua subkriteria & perbandingan AHP-nya.`
            : del
              ? `Subkriteria "${del.name}" akan dihapus. Perbandingan AHP kriteria ini direset.`
              : undefined
        }
        confirmText="Hapus"
        loading={isPending}
        onConfirm={() => {
          if (!del) return;
          run(
            del.kind === "crit" ? deleteCriteria(del.id) : deleteSubcriteria(del.id),
            "Dihapus.",
          );
          setDel(null);
        }}
      />
    </div>
  );
}
