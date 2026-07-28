"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Inbox, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import {
  getAssignments,
  deleteAssignment,
  type AssignmentPageData,
  type AssignmentRow,
} from "@/app/actions/assignment";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AturPenilaianModal } from "@/components/penilaian/AturPenilaianModal";

type StatusFilter = "all" | "assigned" | "unassigned";

export function AturPenilaianClient({ initial }: { initial: AssignmentPageData }) {
  const [rows, setRows] = useState<AssignmentRow[]>(initial.rows);
  const [branchId, setBranchId] = useState("all");
  const [deptId, setDeptId] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<AssignmentRow | null>(null);
  const [pending, start] = useTransition();

  const depts =
    branchId === "all"
      ? initial.departments
      : initial.departments.filter((d) => String(d.branchId) === branchId);

  const load = useCallback(() => {
    setLoading(true);
    getAssignments({
      branchId: branchId !== "all" ? Number(branchId) : undefined,
      departmentId: deptId !== "all" ? Number(deptId) : undefined,
      search: search.trim() || undefined,
      status,
    })
      .then((d) => setRows(d.rows))
      .finally(() => setLoading(false));
  }, [branchId, deptId, search, status]);

  useEffect(() => {
    const h = setTimeout(load, 300);
    return () => clearTimeout(h);
  }, [load]);

  function del(row: AssignmentRow) {
    if (!row.assignmentId) return;
    start(async () => {
      let res = await deleteAssignment(row.assignmentId!);
      if (!res.ok && res.needConfirm) {
        if (!window.confirm(`${res.error}\n\nLanjutkan?`)) return;
        res = await deleteAssignment(row.assignmentId!, true);
      }
      if (res.ok) {
        toast.success("Penugasan dihapus.");
        load();
      } else if (!res.needConfirm) {
        toast.error(res.error);
      }
    });
  }

  if (!initial.period) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Atur Penilaian"
          description="Tentukan siapa menilai siapa untuk periode aktif."
        />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Inbox className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            Tidak ada periode aktif
          </p>
          <p className="text-sm text-slate-500">
            Aktifkan sebuah periode terlebih dahulu di menu Kelola Periode.
          </p>
        </div>
      </div>
    );
  }

  const penilaiCell = (p: AssignmentRow["penilai1"]) =>
    p ? (
      <span className="text-slate-700">
        {p.name}{" "}
        <span className="text-xs text-slate-400">({p.weightPct}%)</span>
      </span>
    ) : (
      <span className="text-slate-300">—</span>
    );

  const columns: Column<AssignmentRow>[] = [
    {
      header: "Nama",
      cell: (r) => <span className="font-medium text-slate-900">{r.name}</span>,
    },
    { header: "Jabatan", cell: (r) => <span className="text-slate-600">{r.jabatanName}</span> },
    { header: "Cabang", cell: (r) => <span className="text-slate-600">{r.branchName}</span> },
    { header: "Departemen", cell: (r) => <span className="text-slate-600">{r.departmentName}</span> },
    { header: "Penilai 1", cell: (r) => penilaiCell(r.penilai1) },
    { header: "Penilai 2", cell: (r) => penilaiCell(r.penilai2) },
    {
      header: "KPI",
      cell: (r) => (
        <Badge variant={r.kpiType === "atas" ? "blue" : "orange"}>
          {r.kpiType === "atas" ? "KPI Pengawas" : "KPI Pelaksana"}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (r) =>
        r.assigned ? (
          <Badge variant="green">Sudah Diatur</Badge>
        ) : (
          <Badge variant="slate">Belum Diatur</Badge>
        ),
    },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant={r.assigned ? "outline" : "default"} onClick={() => setTarget(r)}>
            {r.assigned ? (
              <>
                <Pencil className="h-4 w-4" /> Edit
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Atur
              </>
            )}
          </Button>
          {r.assigned && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => del(r)}
              disabled={pending}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[92rem] space-y-6">
      <PageHeader
        title="Atur Penilaian"
        description="Tentukan siapa menilai siapa untuk periode aktif."
      />

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="blue">Periode Aktif: {initial.period.name}</Badge>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Cabang</Label>
            <Select
              value={branchId}
              onValueChange={(v) => {
                setBranchId(v);
                setDeptId("all");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {initial.branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Departemen</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Cari Nama</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama karyawan..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="assigned">Sudah Diatur</SelectItem>
                <SelectItem value="unassigned">Belum Diatur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={rows}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              <Inbox className="h-8 w-8 text-slate-300" />
              <span>Tidak ada karyawan sesuai filter.</span>
            </div>
          }
        />
      </div>

      <AturPenilaianModal
        target={target}
        onClose={() => setTarget(null)}
        onSaved={() => {
          setTarget(null);
          load();
        }}
      />
    </div>
  );
}
