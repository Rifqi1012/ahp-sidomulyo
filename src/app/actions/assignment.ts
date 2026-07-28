"use server";

import { revalidatePath } from "next/cache";
import type { KpiType, RoleType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { getKpiTypeForAssessee } from "@/lib/assessmentService";
import {
  computeWeights,
  ELIGIBLE_ASSESSOR_ROLES,
} from "@/lib/assessorWeights";

const ASSESSEE_ROLES: RoleType[] = [
  "kepala_cabang",
  "kepala_divisi",
  "karyawan",
];

async function requireHrd() {
  const user = await getSessionUser();
  if (!user || user.role !== "hrd") return null;
  return user;
}

async function activePeriod() {
  return prisma.period.findFirst({ where: { status: "ACTIVE" } });
}

// ---------------------------------------------------------------------------
// Data untuk halaman Atur Penilaian
// ---------------------------------------------------------------------------

export type AssignmentPenilai = {
  name: string;
  jabatanName: string;
  weightPct: number;
};

export type AssignmentRow = {
  assesseeId: number;
  name: string;
  jabatanName: string;
  branchName: string;
  departmentName: string;
  kpiType: KpiType;
  assignmentId: number | null;
  assessor1Id: number | null;
  assessor2Id: number | null;
  penilai1: AssignmentPenilai | null;
  penilai2: AssignmentPenilai | null;
  assigned: boolean;
  hasSubmitted: boolean;
};

export type AssignmentFilter = {
  branchId?: number;
  departmentId?: number;
  search?: string;
  status?: "all" | "assigned" | "unassigned";
};

export type AssignmentPageData = {
  period: { id: number; name: string } | null;
  rows: AssignmentRow[];
  branches: { id: number; name: string }[];
  departments: { id: number; name: string; branchId: number }[];
};

export async function getAssignments(
  filter: AssignmentFilter = {},
): Promise<AssignmentPageData> {
  const hrd = await requireHrd();
  const period = await activePeriod();
  const [branches, departments] = await Promise.all([
    prisma.branch.findMany({
      orderBy: [{ isPusat: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, branchId: true },
    }),
  ]);

  if (!hrd || !period) {
    return { period: null, rows: [], branches, departments };
  }

  const assessees = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ASSESSEE_ROLES },
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      ...(filter.search ? { name: { contains: filter.search } } : {}),
    },
    include: { branch: true, department: true, jabatan: true },
    orderBy: { name: "asc" },
  });
  const ids = assessees.map((a) => a.id);

  const [assignments, submitted] = await Promise.all([
    prisma.assessmentAssignment.findMany({
      where: { periodId: period.id, assesseeId: { in: ids } },
      include: {
        assessor1: { include: { jabatan: true } },
        assessor2: { include: { jabatan: true } },
      },
    }),
    prisma.assessment.findMany({
      where: {
        periodId: period.id,
        assesseeId: { in: ids },
        status: "SUBMITTED",
      },
      select: { assesseeId: true },
    }),
  ]);
  const asgMap = new Map(assignments.map((a) => [a.assesseeId, a]));
  const submittedSet = new Set(submitted.map((s) => s.assesseeId));

  const mkPenilai = (
    u: { name: string; jabatan: { name: string } | null } | null,
    weightPct: number | null,
  ): AssignmentPenilai | null =>
    u && weightPct != null
      ? { name: u.name, jabatanName: u.jabatan?.name ?? "—", weightPct }
      : null;

  const rows: AssignmentRow[] = assessees.map((t) => {
    const asg = asgMap.get(t.id) ?? null;
    return {
      assesseeId: t.id,
      name: t.name,
      jabatanName: t.jabatan?.name ?? "—",
      branchName: t.branch?.name ?? "—",
      departmentName: t.department?.name ?? "—",
      kpiType: getKpiTypeForAssessee(t.role),
      assignmentId: asg?.id ?? null,
      assessor1Id: asg?.assessor1Id ?? null,
      assessor2Id: asg?.assessor2Id ?? null,
      penilai1: asg ? mkPenilai(asg.assessor1, asg.weight1Pct) : null,
      penilai2: asg ? mkPenilai(asg.assessor2, asg.weight2Pct) : null,
      assigned: !!asg,
      hasSubmitted: submittedSet.has(t.id),
    };
  });

  const filtered =
    filter.status === "assigned"
      ? rows.filter((r) => r.assigned)
      : filter.status === "unassigned"
        ? rows.filter((r) => !r.assigned)
        : rows;

  return {
    period: { id: period.id, name: period.name },
    rows: filtered,
    branches,
    departments,
  };
}

export type EligibleAssessor = {
  id: number;
  name: string;
  jabatanName: string;
  role: RoleType;
};

export async function getEligibleAssessors(
  assesseeId: number,
  excludeId?: number,
): Promise<EligibleAssessor[]> {
  if (!(await requireHrd())) return [];
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ELIGIBLE_ASSESSOR_ROLES },
      id: { notIn: [assesseeId, ...(excludeId ? [excludeId] : [])] },
    },
    include: { jabatan: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    jabatanName: u.jabatan?.name ?? "—",
    role: u.role,
  }));
}

// ---------------------------------------------------------------------------
// Simpan / hapus penugasan
// ---------------------------------------------------------------------------

export type SaveAssignmentInput = {
  assesseeId: number;
  assessor1Id: number;
  assessor2Id?: number | null;
};

export type SaveAssignmentResult =
  | { ok: true }
  | { ok: false; error: string; needConfirm?: boolean };

export async function saveAssignment(
  data: SaveAssignmentInput,
  force = false,
): Promise<SaveAssignmentResult> {
  const hrd = await requireHrd();
  if (!hrd) return { ok: false, error: "Anda tidak memiliki akses." };

  const period = await activePeriod();
  if (!period) return { ok: false, error: "Tidak ada periode aktif." };

  const a2 = data.assessor2Id || null;
  if (!data.assessor1Id) return { ok: false, error: "Penilai 1 wajib diisi." };
  if (a2 === data.assessor1Id)
    return { ok: false, error: "Penilai 1 dan Penilai 2 tidak boleh sama." };
  if (data.assessor1Id === data.assesseeId || a2 === data.assesseeId)
    return { ok: false, error: "Penilai tidak boleh menilai dirinya sendiri." };

  const [assessee, assessor1, assessor2] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.assesseeId } }),
    prisma.user.findUnique({ where: { id: data.assessor1Id } }),
    a2 ? prisma.user.findUnique({ where: { id: a2 } }) : Promise.resolve(null),
  ]);
  if (!assessee || !assessor1)
    return { ok: false, error: "Data pengguna tidak ditemukan." };
  if (
    !ELIGIBLE_ASSESSOR_ROLES.includes(assessor1.role) ||
    (assessor2 && !ELIGIBLE_ASSESSOR_ROLES.includes(assessor2.role))
  )
    return { ok: false, error: "Penilai harus HRD, Kepala Cabang, atau Kepala Divisi." };

  const w = computeWeights(assessor1.role, assessor2?.role);
  const kpiType = getKpiTypeForAssessee(assessee.role);

  // Cek penilaian yang sudah disubmit (mengubah = menghapusnya).
  const submitted = await prisma.assessment.count({
    where: {
      periodId: period.id,
      assesseeId: data.assesseeId,
      status: "SUBMITTED",
    },
  });
  if (submitted > 0 && !force) {
    return {
      ok: false,
      needConfirm: true,
      error:
        "Penilaian untuk karyawan ini sudah ada yang disubmit. Mengubah penugasan akan menghapus penilaian tersebut.",
    };
  }

  // ponytail: hapus semua assessment + final score lama lalu buat ulang lazily
  // saat penilai membuka form. Draft ikut terhapus — sesuai spek reassign.
  await prisma.$transaction([
    prisma.assessment.deleteMany({
      where: { periodId: period.id, assesseeId: data.assesseeId },
    }),
    prisma.assessmentFinalScore.deleteMany({
      where: { periodId: period.id, assesseeId: data.assesseeId },
    }),
    prisma.assessmentAssignment.upsert({
      where: {
        periodId_assesseeId: {
          periodId: period.id,
          assesseeId: data.assesseeId,
        },
      },
      create: {
        periodId: period.id,
        assesseeId: data.assesseeId,
        assessor1Id: data.assessor1Id,
        assessor2Id: a2,
        weight1Pct: w.weight1,
        weight2Pct: w.weight2,
        kpiType,
        createdBy: hrd.id,
      },
      update: {
        assessor1Id: data.assessor1Id,
        assessor2Id: a2,
        weight1Pct: w.weight1,
        weight2Pct: w.weight2,
        kpiType,
      },
    }),
  ]);

  revalidatePath("/hrd/atur-penilaian");
  return { ok: true };
}

export async function deleteAssignment(
  assignmentId: number,
  force = false,
): Promise<SaveAssignmentResult> {
  const hrd = await requireHrd();
  if (!hrd) return { ok: false, error: "Anda tidak memiliki akses." };

  const asg = await prisma.assessmentAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!asg) return { ok: false, error: "Penugasan tidak ditemukan." };

  const submitted = await prisma.assessment.count({
    where: {
      periodId: asg.periodId,
      assesseeId: asg.assesseeId,
      status: "SUBMITTED",
    },
  });
  if (submitted > 0 && !force) {
    return {
      ok: false,
      needConfirm: true,
      error:
        "Sudah ada penilaian yang disubmit. Menghapus penugasan akan menghapus penilaian tersebut.",
    };
  }

  await prisma.$transaction([
    prisma.assessment.deleteMany({
      where: { periodId: asg.periodId, assesseeId: asg.assesseeId },
    }),
    prisma.assessmentFinalScore.deleteMany({
      where: { periodId: asg.periodId, assesseeId: asg.assesseeId },
    }),
    prisma.assessmentAssignment.delete({ where: { id: assignmentId } }),
  ]);

  revalidatePath("/hrd/atur-penilaian");
  return { ok: true };
}
