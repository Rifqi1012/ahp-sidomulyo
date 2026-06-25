import Link from "next/link";
import { CalendarX2, ClipboardList, Eye, Inbox } from "lucide-react";

import { getAssessmentList } from "@/app/actions/assessment";
import type { AssessableUser } from "@/lib/assessmentService";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Countdown } from "@/components/shared/Countdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  AssessableUser["status"],
  { label: string; dot: string; text: string }
> = {
  belum: { label: "Belum Dinilai", dot: "bg-red-500", text: "text-red-600" },
  draft: { label: "Draft", dot: "bg-yellow-500", text: "text-yellow-600" },
  submitted: { label: "Selesai", dot: "bg-green-500", text: "text-green-600" },
};

function StatusBadge({ status }: { status: AssessableUser["status"] }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", m.text)}>
      <span className={cn("h-2 w-2 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export async function PenilaianList({ basePath }: { basePath: string }) {
  const { period, deadlinePassed, items } = await getAssessmentList();

  if (!period) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="Penilaian" description="Daftar karyawan yang Anda nilai." />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Inbox className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            Tidak ada periode penilaian aktif
          </p>
          <p className="text-sm text-slate-500">
            Penilaian akan tersedia saat HRD mengaktifkan sebuah periode.
          </p>
        </div>
      </div>
    );
  }

  const columns: Column<AssessableUser>[] = [
    {
      header: "Nama",
      cell: (r) => <span className="font-medium text-slate-900">{r.name}</span>,
    },
    { header: "Jabatan", cell: (r) => <span className="text-slate-600">{r.jabatanName}</span> },
    {
      header: "Departemen",
      cell: (r) => <span className="text-slate-600">{r.departmentName}</span>,
    },
    { header: "Cabang", cell: (r) => <span className="text-slate-600">{r.branchName}</span> },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right",
      cell: (r) => {
        const formHref = `${basePath}/penilaian/${r.id}`;
        if (r.status === "submitted") {
          return (
            <Button variant="outline" size="sm" asChild>
              <Link href={formHref}>
                <Eye className="h-4 w-4" />
                Lihat Hasil
              </Link>
            </Button>
          );
        }
        if (deadlinePassed) {
          return r.status === "draft" ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={formHref}>
                <Eye className="h-4 w-4" />
                Lihat
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Terlewat
            </Button>
          );
        }
        return (
          <Button size="sm" asChild>
            <Link href={formHref}>
              <ClipboardList className="h-4 w-4" />
              {r.status === "draft" ? "Lanjutkan" : "Nilai Sekarang"}
            </Link>
          </Button>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Penilaian" description="Daftar karyawan yang Anda nilai." />

      {/* Banner periode */}
      {deadlinePassed ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CalendarX2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Periode penilaian telah berakhir</p>
            <p>{period.name} — input penilaian sudah ditutup.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-slate-500">Periode Aktif</p>
            <p className="text-sm font-semibold text-slate-900">{period.name}</p>
          </div>
          <Countdown deadline={period.deadline} />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={items}
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-4">
              <Inbox className="h-8 w-8 text-slate-300" />
              <span>Tidak ada karyawan yang perlu Anda nilai.</span>
            </div>
          }
        />
      </div>
    </div>
  );
}
