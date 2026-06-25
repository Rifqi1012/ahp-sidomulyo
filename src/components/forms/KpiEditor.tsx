"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
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
import { BobotInput } from "@/components/forms/BobotInput";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { saveKpi, type KpiTemplateDTO } from "@/app/actions/kpi";

const TOLERANCE = 0.1;
const near100 = (n: number) => Math.abs(n - 100) <= TOLERANCE;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type SubDraft = {
  key: string;
  name: string;
  description: string;
  bobotPersen: number;
};
type CritDraft = { key: string; name: string; subcriteria: SubDraft[] };

type ConfirmDel =
  | { kind: "crit"; critKey: string; name: string }
  | { kind: "sub"; critKey: string; subKey: string; name: string }
  | null;

type KpiEditorProps = {
  type: KpiType;
  title: string;
  info: string;
  kpi: KpiTemplateDTO;
};

function toDrafts(kpi: KpiTemplateDTO): CritDraft[] {
  return kpi.criteria.map((c) => ({
    key: `c${c.id}`,
    name: c.name,
    subcriteria: c.subcriteria.map((s) => ({
      key: `s${s.id}`,
      name: s.name,
      description: s.description,
      bobotPersen: s.bobotPersen,
    })),
  }));
}

function serialize(criteria: CritDraft[]): string {
  return JSON.stringify(
    criteria.map((c) => ({
      name: c.name,
      sub: c.subcriteria.map((s) => [s.name, s.description, s.bobotPersen]),
    })),
  );
}

export function KpiEditor({ type, title, info, kpi }: KpiEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const keyCounter = useRef(0);
  const nextKey = (p: string) => `${p}-new-${keyCounter.current++}`;

  const [criteria, setCriteria] = useState<CritDraft[]>(() => toDrafts(kpi));
  const initialSnapshot = useMemo(() => serialize(toDrafts(kpi)), [kpi]);

  // CRUD UI state
  const [addingCrit, setAddingCrit] = useState(false);
  const [newCritName, setNewCritName] = useState("");
  const [editingCritKey, setEditingCritKey] = useState<string | null>(null);
  const [editCritName, setEditCritName] = useState("");
  const [addSubFor, setAddSubFor] = useState<string | null>(null);
  const [newSub, setNewSub] = useState({ name: "", description: "", bobot: 0 });
  const [editingSubKey, setEditingSubKey] = useState<string | null>(null);
  const [editSub, setEditSub] = useState({ name: "", description: "", bobot: 0 });
  const [confirmDel, setConfirmDel] = useState<ConfirmDel>(null);
  const [saveConfirm, setSaveConfirm] = useState(false);

  const isDirty = serialize(criteria) !== initialSnapshot;
  const allValid =
    criteria.length > 0 &&
    criteria.every(
      (c) =>
        c.subcriteria.length > 0 &&
        near100(c.subcriteria.reduce((s, x) => s + (x.bobotPersen || 0), 0)),
    );

  // ---- mutations on local draft ----
  function patchCrit(critKey: string, fn: (c: CritDraft) => CritDraft) {
    setCriteria((prev) => prev.map((c) => (c.key === critKey ? fn(c) : c)));
  }

  function addCriteria() {
    const name = newCritName.trim();
    if (!name) return;
    setCriteria((prev) => [
      ...prev,
      { key: nextKey("c"), name, subcriteria: [] },
    ]);
    setNewCritName("");
    setAddingCrit(false);
  }

  function saveCritName(critKey: string) {
    const name = editCritName.trim();
    if (!name) return;
    patchCrit(critKey, (c) => ({ ...c, name }));
    setEditingCritKey(null);
  }

  function addSubcriteria(critKey: string) {
    const name = newSub.name.trim();
    if (!name) return;
    patchCrit(critKey, (c) => ({
      ...c,
      subcriteria: [
        ...c.subcriteria,
        {
          key: nextKey("s"),
          name,
          description: newSub.description.trim(),
          bobotPersen: newSub.bobot,
        },
      ],
    }));
    setNewSub({ name: "", description: "", bobot: 0 });
    setAddSubFor(null);
  }

  function saveSubEdit(critKey: string, subKey: string) {
    const name = editSub.name.trim();
    if (!name) return;
    patchCrit(critKey, (c) => ({
      ...c,
      subcriteria: c.subcriteria.map((s) =>
        s.key === subKey
          ? {
              ...s,
              name,
              description: editSub.description.trim(),
              bobotPersen: editSub.bobot,
            }
          : s,
      ),
    }));
    setEditingSubKey(null);
  }

  function setSubBobot(critKey: string, subKey: string, bobot: number) {
    patchCrit(critKey, (c) => ({
      ...c,
      subcriteria: c.subcriteria.map((s) =>
        s.key === subKey ? { ...s, bobotPersen: bobot } : s,
      ),
    }));
  }

  function handleDelete() {
    if (!confirmDel) return;
    if (confirmDel.kind === "crit") {
      setCriteria((prev) => prev.filter((c) => c.key !== confirmDel.critKey));
    } else {
      patchCrit(confirmDel.critKey, (c) => ({
        ...c,
        subcriteria: c.subcriteria.filter((s) => s.key !== confirmDel.subKey),
      }));
    }
    setConfirmDel(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveKpi(type, {
        criteria: criteria.map((c) => ({
          name: c.name,
          subcriteria: c.subcriteria.map((s) => ({
            name: s.name,
            description: s.description,
            bobotPersen: s.bobotPersen,
          })),
        })),
      });
      if (result.success) {
        toast.success(`KPI berhasil disimpan (Versi ${result.newVersion}).`);
        setSaveConfirm(false);
        router.refresh();
      } else {
        toast.error(result.errors.join(" "));
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{info}</p>
          <Badge variant="slate">
            Versi {kpi.version} — Terakhir diubah: {formatDate(kpi.createdAt)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/hrd/kpi/${type}/ahp-result`}>
              <BarChart3 className="h-4 w-4" />
              Lihat Hasil AHP
            </Link>
          </Button>
          <Button
            onClick={() => setSaveConfirm(true)}
            disabled={!allValid || !isDirty || isPending}
          >
            <Save className="h-4 w-4" />
            Simpan Perubahan
          </Button>
        </div>
      </div>

      {/* Kriteria */}
      <div className="space-y-5">
        {criteria.map((c, i) => {
          const subtotal = c.subcriteria.reduce(
            (s, x) => s + (x.bobotPersen || 0),
            0,
          );
          const status = near100(subtotal)
            ? "ok"
            : subtotal < 100
              ? "under"
              : "over";
          return (
            <div
              key={c.key}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              {/* Header kriteria */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                {editingCritKey === c.key ? (
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
                      onClick={() => saveCritName(c.key)}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingCritKey(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-base font-semibold text-slate-900">
                    {LETTERS[i]}. {c.name}
                  </h2>
                )}
                {editingCritKey !== c.key && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingCritKey(c.key);
                        setEditCritName(c.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        setConfirmDel({
                          kind: "crit",
                          critKey: c.key,
                          name: c.name,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Subkriteria */}
              <div className="mt-4 space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Sub-kriteria
                </p>

                {c.subcriteria.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Belum ada subkriteria.
                  </p>
                )}

                {c.subcriteria.map((s) =>
                  editingSubKey === s.key ? (
                    <div
                      key={s.key}
                      className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <Input
                        value={editSub.name}
                        onChange={(e) =>
                          setEditSub((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="Nama subkriteria"
                        className="h-9"
                      />
                      <Textarea
                        value={editSub.description}
                        onChange={(e) =>
                          setEditSub((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Deskripsi"
                        rows={2}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-slate-500">Bobot</Label>
                          <BobotInput
                            value={editSub.bobot}
                            onChange={(v) =>
                              setEditSub((p) => ({ ...p, bobot: v }))
                            }
                            className="h-9 w-24"
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSubKey(null)}
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveSubEdit(c.key, s.key)}
                          >
                            Simpan
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={s.key}
                      className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {s.name}
                        </p>
                        {s.description && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {s.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-500">Bobot</Label>
                        <BobotInput
                          value={s.bobotPersen}
                          onChange={(v) => setSubBobot(c.key, s.key, v)}
                          className="h-9 w-20"
                        />
                        <span className="text-sm text-slate-500">%</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingSubKey(s.key);
                            setEditSub({
                              name: s.name,
                              description: s.description,
                              bobot: s.bobotPersen,
                            });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            setConfirmDel({
                              kind: "sub",
                              critKey: c.key,
                              subKey: s.key,
                              name: s.name,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ),
                )}

                {/* Form tambah subkriteria */}
                {addSubFor === c.key ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <Input
                      value={newSub.name}
                      onChange={(e) =>
                        setNewSub((p) => ({ ...p, name: e.target.value }))
                      }
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-slate-500">Bobot</Label>
                        <BobotInput
                          value={newSub.bobot}
                          onChange={(v) => setNewSub((p) => ({ ...p, bobot: v }))}
                          className="h-9 w-24"
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddSubFor(null);
                            setNewSub({ name: "", description: "", bobot: 0 });
                          }}
                        >
                          Batal
                        </Button>
                        <Button size="sm" onClick={() => addSubcriteria(c.key)}>
                          Simpan
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => {
                      setAddSubFor(c.key);
                      setNewSub({ name: "", description: "", bobot: 0 });
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Subkriteria
                  </Button>
                )}

                {/* Total bobot */}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                    status === "ok" && "bg-green-50 text-green-700",
                    status === "under" && "bg-yellow-50 text-yellow-700",
                    status === "over" && "bg-red-50 text-red-700",
                  )}
                >
                  {status === "ok" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {status === "ok" && `Total bobot: ${subtotal.toFixed(2)}%`}
                  {status === "under" &&
                    `Total bobot: ${subtotal.toFixed(2)}% (kurang ${(100 - subtotal).toFixed(2)}%)`}
                  {status === "over" &&
                    `Total bobot: ${subtotal.toFixed(2)}% (lebih ${(subtotal - 100).toFixed(2)}%)`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tambah kriteria */}
      {addingCrit ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Label htmlFor="newCrit">Nama Kriteria</Label>
          <Input
            id="newCrit"
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
            <Button onClick={addCriteria}>Simpan Kriteria</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAddingCrit(true)}>
          <Plus className="h-4 w-4" />
          Tambah Kriteria
        </Button>
      )}

      {/* Konfirmasi hapus */}
      <ConfirmDialog
        open={confirmDel !== null}
        onOpenChange={(open) => !open && setConfirmDel(null)}
        title={
          confirmDel?.kind === "crit"
            ? "Hapus kriteria?"
            : "Hapus subkriteria?"
        }
        description={
          confirmDel?.kind === "crit"
            ? `Menghapus kriteria "${confirmDel.name}" akan menghapus semua subkriteria di dalamnya. Lanjutkan?`
            : confirmDel
              ? `Subkriteria "${confirmDel.name}" akan dihapus.`
              : undefined
        }
        confirmText="Hapus"
        onConfirm={handleDelete}
      />

      {/* Konfirmasi simpan */}
      <ConfirmDialog
        open={saveConfirm}
        onOpenChange={setSaveConfirm}
        title="Simpan KPI versi baru?"
        description="Menyimpan KPI akan membuat versi baru. Penilaian yang sudah ada tidak akan terpengaruh. Lanjutkan?"
        confirmText="Simpan"
        loading={isPending}
        onConfirm={handleSave}
      />

      {isPending && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Menyimpan...
        </p>
      )}
    </div>
  );
}
