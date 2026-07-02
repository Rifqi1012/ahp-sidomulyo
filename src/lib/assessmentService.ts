import type { RoleType, KpiType, Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export type AssessorContext = {
  id: number;
  role: RoleType;
  branchId: number | null;
  departmentId: number | null;
};

export type AssessmentStatusKind = "belum" | "draft" | "submitted";

export type AssessableUser = {
  id: number;
  name: string;
  jabatanName: string;
  departmentName: string;
  branchName: string;
  status: AssessmentStatusKind;
  isComplete: boolean;
  finalScore: number | null;
};

// ---------------------------------------------------------------------------
// Aturan KPI, bobot penilai, slot penilai
// ---------------------------------------------------------------------------

/** KPI Atas untuk KC & KD, KPI Bawah untuk Karyawan. */
export function getKpiTypeForAssessee(role: RoleType): KpiType {
  return role === "karyawan" ? "bawah" : "atas";
}

/**
 * Bobot penilai (%) berdasarkan matriks penilaian:
 *   HRD→KC/KD Pusat = 100, HRD→KD Cabang = 60, KC→KD Cabang = 40,
 *   KC→Karyawan = 60, KD→Karyawan = 40.
 */
export function getWeightPct(
  assessorRole: RoleType,
  assesseeRole: RoleType,
  assesseeBranchIsPusat: boolean,
): number {
  if (assessorRole === "hrd") {
    if (assesseeRole === "kepala_cabang") return 100;
    if (assesseeRole === "kepala_divisi") return assesseeBranchIsPusat ? 100 : 60;
  }
  if (assessorRole === "kepala_cabang") {
    if (assesseeRole === "kepala_divisi") return 40;
    if (assesseeRole === "karyawan") return 60;
  }
  if (assessorRole === "kepala_divisi") {
    if (assesseeRole === "karyawan") return 40;
  }
  return 0;
}

export type AssessorSlot = { label: string; weightPct: number };

/** Daftar penilai yang diharapkan untuk seorang assessee. */
export function expectedSlots(
  assesseeRole: RoleType,
  branchIsPusat: boolean,
): AssessorSlot[] {
  if (assesseeRole === "kepala_cabang") {
    return [{ label: "HRD", weightPct: 100 }];
  }
  if (assesseeRole === "kepala_divisi") {
    return branchIsPusat
      ? [{ label: "HRD", weightPct: 100 }]
      : [
          { label: "HRD", weightPct: 60 },
          { label: "Kepala Cabang", weightPct: 40 },
        ];
  }
  if (assesseeRole === "karyawan") {
    return [
      { label: "Kepala Cabang", weightPct: 60 },
      { label: "Kepala Divisi", weightPct: 40 },
    ];
  }
  return [];
}

export type PerformanceCategory =
  | "Sangat Baik"
  | "Baik"
  | "Cukup"
  | "Kurang"
  | "Sangat Kurang";

export function categoryOf(score: number): PerformanceCategory {
  if (score >= 4.5) return "Sangat Baik";
  if (score >= 3.5) return "Baik";
  if (score >= 2.5) return "Cukup";
  if (score >= 1.5) return "Kurang";
  return "Sangat Kurang";
}

// ---------------------------------------------------------------------------
// Perhitungan skor
// ---------------------------------------------------------------------------

/**
 * Total skor satu assessment = Σ (score × ahpWeight global subkriteria).
 * ahpWeight sudah global sehingga totalnya berada di rentang 1–5.
 */
export async function calculateScore(assessmentId: number): Promise<number> {
  const details = await prisma.assessmentDetail.findMany({
    where: { assessmentId },
    include: { kpiSubcriteria: true },
  });

  let total = 0;
  for (const d of details) {
    total += d.score * Number(d.kpiSubcriteria.globalWeight ?? 0);
  }

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { totalScore: total },
  });

  return total;
}

/**
 * Hitung final score assessee untuk satu periode.
 * Lengkap jika seluruh penilai (Σ weightPct = 100) sudah SUBMITTED.
 *   finalScore = Σ (totalScore × weightPct / 100)
 */
export async function calculateFinalScore(
  periodId: number,
  assesseeId: number,
): Promise<void> {
  const assessments = await prisma.assessment.findMany({
    where: { periodId, assesseeId },
  });
  const submitted = assessments.filter((a) => a.status === "SUBMITTED");
  const weightSum = submitted.reduce((s, a) => s + a.weightPct, 0);
  const isComplete = weightSum === 100;

  const finalScore = isComplete
    ? submitted.reduce(
        (s, a) => s + Number(a.totalScore ?? 0) * (a.weightPct / 100),
        0,
      )
    : null;

  await prisma.assessmentFinalScore.upsert({
    where: { periodId_assesseeId: { periodId, assesseeId } },
    create: {
      periodId,
      assesseeId,
      finalScore,
      isComplete,
      calculatedAt: isComplete ? new Date() : null,
    },
    update: {
      finalScore,
      isComplete,
      calculatedAt: isComplete ? new Date() : null,
    },
  });
}

// ---------------------------------------------------------------------------
// Daftar user yang bisa dinilai oleh assessor
// ---------------------------------------------------------------------------

export async function getAssessableUsers(
  assessor: AssessorContext,
  periodId: number,
): Promise<AssessableUser[]> {
  let whereClause: Prisma.UserWhereInput;

  if (assessor.role === "hrd") {
    whereClause = {
      isActive: true,
      role: { in: ["kepala_cabang", "kepala_divisi"] },
    };
  } else if (assessor.role === "kepala_cabang") {
    whereClause = {
      isActive: true,
      branchId: assessor.branchId ?? -1,
      role: { in: ["kepala_divisi", "karyawan"] },
    };
  } else if (assessor.role === "kepala_divisi") {
    whereClause = {
      isActive: true,
      branchId: assessor.branchId ?? -1,
      departmentId: assessor.departmentId ?? -1,
      role: "karyawan",
    };
  } else {
    return [];
  }

  const targets = await prisma.user.findMany({
    where: whereClause,
    include: { branch: true, department: true, jabatan: true },
    orderBy: { name: "asc" },
  });
  const ids = targets.map((t) => t.id);

  const [assessments, finals] = await Promise.all([
    prisma.assessment.findMany({
      where: { periodId, assessorId: assessor.id, assesseeId: { in: ids } },
    }),
    prisma.assessmentFinalScore.findMany({
      where: { periodId, assesseeId: { in: ids } },
    }),
  ]);

  const byAssessee = new Map(assessments.map((a) => [a.assesseeId, a]));
  const finalByAssessee = new Map(finals.map((f) => [f.assesseeId, f]));

  return targets.map((t) => {
    const a = byAssessee.get(t.id);
    const f = finalByAssessee.get(t.id);
    const status: AssessmentStatusKind = !a
      ? "belum"
      : a.status === "SUBMITTED"
        ? "submitted"
        : "draft";
    return {
      id: t.id,
      name: t.name,
      jabatanName: t.jabatan?.name ?? "—",
      departmentName: t.department?.name ?? "—",
      branchName: t.branch?.name ?? "—",
      status,
      isComplete: f?.isComplete ?? false,
      finalScore: f?.finalScore != null ? Number(f.finalScore) : null,
    };
  });
}
