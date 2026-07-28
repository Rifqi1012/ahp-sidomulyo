import type { RoleType, KpiType } from "@prisma/client";

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
  // Assessee ditentukan manual oleh HRD via AssessmentAssignment: user hanya
  // menilai orang yang ditugaskan padanya (sebagai penilai 1 atau 2).
  const assignments = await prisma.assessmentAssignment.findMany({
    where: {
      periodId,
      OR: [{ assessor1Id: assessor.id }, { assessor2Id: assessor.id }],
    },
    include: {
      assessee: { include: { branch: true, department: true, jabatan: true } },
    },
    orderBy: { assessee: { name: "asc" } },
  });
  const ids = assignments.map((a) => a.assesseeId);
  if (ids.length === 0) return [];

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

  return assignments.map((asg) => {
    const t = asg.assessee;
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

export type AssignmentSlot = {
  assessorId: number;
  label: string;
  weightPct: number;
};

/** Slot penilai yang ditugaskan HRD untuk seorang assessee (urut penilai 1,2). */
export async function getAssignmentSlots(
  periodId: number,
  assesseeId: number,
): Promise<AssignmentSlot[]> {
  const asg = await prisma.assessmentAssignment.findUnique({
    where: { periodId_assesseeId: { periodId, assesseeId } },
    include: {
      assessor1: { include: { jabatan: true } },
      assessor2: { include: { jabatan: true } },
    },
  });
  if (!asg) return [];
  const slots: AssignmentSlot[] = [
    {
      assessorId: asg.assessor1Id,
      label: asg.assessor1.jabatan?.name ?? asg.assessor1.name,
      weightPct: asg.weight1Pct,
    },
  ];
  if (asg.assessor2 && asg.assessor2Id && asg.weight2Pct != null) {
    slots.push({
      assessorId: asg.assessor2Id,
      label: asg.assessor2.jabatan?.name ?? asg.assessor2.name,
      weightPct: asg.weight2Pct,
    });
  }
  return slots;
}
