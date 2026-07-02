"use server";

import { revalidatePath } from "next/cache";
import type { RoleType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import {
  calculateScore,
  calculateFinalScore,
  getAssessableUsers,
  getKpiTypeForAssessee,
  getWeightPct,
  expectedSlots,
  categoryOf,
  type AssessableUser,
} from "@/lib/assessmentService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deadlinePassed(deadline: Date): boolean {
  const end = new Date(deadline);
  end.setUTCHours(23, 59, 59, 999);
  return Date.now() > end.getTime();
}

async function getActivePeriod() {
  return prisma.period.findFirst({ where: { status: "ACTIVE" } });
}

type SessionAssessor = {
  id: number;
  role: RoleType;
  branchId: number | null;
  departmentId: number | null;
};

function canAssess(
  assessor: SessionAssessor,
  assessee: {
    role: RoleType;
    branchId: number | null;
    departmentId: number | null;
  },
): boolean {
  if (assessor.role === "hrd") {
    return ["kepala_cabang", "kepala_divisi"].includes(assessee.role);
  }
  if (assessor.role === "kepala_cabang") {
    return (
      assessee.branchId === assessor.branchId &&
      ["kepala_divisi", "karyawan"].includes(assessee.role)
    );
  }
  if (assessor.role === "kepala_divisi") {
    return (
      assessee.branchId === assessor.branchId &&
      assessee.departmentId === assessor.departmentId &&
      assessee.role === "karyawan"
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// List penilaian
// ---------------------------------------------------------------------------

export type AssessmentListResult = {
  period: { id: number; name: string; deadline: string } | null;
  deadlinePassed: boolean;
  items: AssessableUser[];
};

export async function getAssessmentList(): Promise<AssessmentListResult> {
  const user = await getSessionUser();
  if (!user) return { period: null, deadlinePassed: false, items: [] };

  const period = await getActivePeriod();
  if (!period) return { period: null, deadlinePassed: false, items: [] };

  const items = await getAssessableUsers(
    {
      id: user.id,
      role: user.role,
      branchId: user.branchId,
      departmentId: user.departmentId,
    },
    period.id,
  );

  return {
    period: {
      id: period.id,
      name: period.name,
      deadline: period.deadlinePenilaian.toISOString(),
    },
    deadlinePassed: deadlinePassed(period.deadlinePenilaian),
    items,
  };
}

// ---------------------------------------------------------------------------
// Form penilaian
// ---------------------------------------------------------------------------

export type AssessmentFormData = {
  assessmentId: number;
  status: "DRAFT" | "SUBMITTED";
  readonly: boolean;
  assessee: {
    name: string;
    jabatanName: string;
    departmentName: string;
    branchName: string;
  };
  period: { name: string; deadline: string };
  criteria: {
    name: string;
    subcriteria: { id: number; name: string; description: string }[];
  }[];
  scores: Record<number, number>;
};

export type GetAssessmentResult =
  | { ok: true; data: AssessmentFormData }
  | { ok: false; error: string };

export async function getOrCreateAssessment(
  assesseeId: number,
): Promise<GetAssessmentResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sesi tidak valid." };

  const period = await getActivePeriod();
  if (!period) return { ok: false, error: "Tidak ada periode aktif." };

  const assessee = await prisma.user.findUnique({
    where: { id: assesseeId },
    include: { branch: true, department: true, jabatan: true },
  });
  if (!assessee) return { ok: false, error: "Karyawan tidak ditemukan." };

  const assessor: SessionAssessor = {
    id: user.id,
    role: user.role,
    branchId: user.branchId,
    departmentId: user.departmentId,
  };
  if (!canAssess(assessor, assessee)) {
    return { ok: false, error: "Anda tidak berhak menilai karyawan ini." };
  }

  const weightPct = getWeightPct(
    user.role,
    assessee.role,
    assessee.branch?.isPusat ?? false,
  );
  if (weightPct <= 0) {
    return { ok: false, error: "Bobot penilaian tidak valid." };
  }

  const kpiType = getKpiTypeForAssessee(assessee.role);
  const kpiTemplateId =
    kpiType === "atas" ? period.kpiAtasId : period.kpiBawahId;
  if (!kpiTemplateId) {
    return { ok: false, error: "Template KPI periode belum tersedia." };
  }

  let assessment = await prisma.assessment.findUnique({
    where: {
      periodId_assessorId_assesseeId: {
        periodId: period.id,
        assessorId: user.id,
        assesseeId,
      },
    },
  });
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        periodId: period.id,
        assessorId: user.id,
        assesseeId,
        kpiTemplateId,
        weightPct,
        status: "DRAFT",
      },
    });
  }

  const template = await prisma.kpiTemplate.findUnique({
    where: { id: assessment.kpiTemplateId },
    include: {
      criteria: {
        orderBy: { orderNumber: "asc" },
        include: { subcriteria: { orderBy: { orderNumber: "asc" } } },
      },
    },
  });
  if (!template) return { ok: false, error: "Template KPI tidak ditemukan." };

  const details = await prisma.assessmentDetail.findMany({
    where: { assessmentId: assessment.id },
  });
  const scores: Record<number, number> = {};
  for (const d of details) scores[d.kpiSubcriteriaId] = d.score;

  const passed = deadlinePassed(period.deadlinePenilaian);

  return {
    ok: true,
    data: {
      assessmentId: assessment.id,
      status: assessment.status,
      readonly: passed || assessment.status === "SUBMITTED",
      assessee: {
        name: assessee.name,
        jabatanName: assessee.jabatan?.name ?? "—",
        departmentName: assessee.department?.name ?? "—",
        branchName: assessee.branch?.name ?? "—",
      },
      period: {
        name: period.name,
        deadline: period.deadlinePenilaian.toISOString(),
      },
      criteria: template.criteria.map((c) => ({
        name: c.name,
        subcriteria: c.subcriteria.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? "",
        })),
      })),
      scores,
    },
  };
}

export type ScoreInput = { subcriteriaId: number; score: number };
export type ActionResult =
  | { success: true }
  | { success: false; error: string };

type EditableAssessment = NonNullable<
  Awaited<ReturnType<typeof prisma.assessment.findUnique>>
> & { period: NonNullable<Awaited<ReturnType<typeof prisma.period.findUnique>>> };

type LoadEditableResult =
  | { ok: false; error: string }
  | { ok: true; assessment: EditableAssessment };

/** Verifikasi assessment milik assessor & dapat diedit. */
async function loadEditableAssessment(
  assessmentId: number,
): Promise<LoadEditableResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sesi tidak valid." };

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { period: true },
  });
  if (!assessment) return { ok: false, error: "Penilaian tidak ditemukan." };
  if (assessment.assessorId !== user.id) {
    return { ok: false, error: "Anda tidak berhak mengubah penilaian ini." };
  }
  if (assessment.status === "SUBMITTED") {
    return { ok: false, error: "Penilaian sudah disubmit dan tidak dapat diubah." };
  }
  if (deadlinePassed(assessment.period.deadlinePenilaian)) {
    return { ok: false, error: "Periode penilaian telah berakhir." };
  }
  return { ok: true, assessment };
}

async function persistScores(assessmentId: number, scores: ScoreInput[]) {
  // ahpWeight global tiap subkriteria untuk weightedScore.
  const subIds = scores.map((s) => s.subcriteriaId);
  const subs = await prisma.kpiSubcriteria.findMany({
    where: { id: { in: subIds } },
    select: { id: true, globalWeight: true },
  });
  const weightMap = new Map(subs.map((s) => [s.id, Number(s.globalWeight ?? 0)]));

  // Map detail yang sudah ada (tidak ada unique komposit di schema).
  const existing = await prisma.assessmentDetail.findMany({
    where: { assessmentId },
    select: { id: true, kpiSubcriteriaId: true },
  });
  const existingMap = new Map(existing.map((e) => [e.kpiSubcriteriaId, e.id]));

  for (const s of scores) {
    if (s.score < 1 || s.score > 5) continue;
    const weighted = s.score * (weightMap.get(s.subcriteriaId) ?? 0);
    const id = existingMap.get(s.subcriteriaId);
    if (id) {
      await prisma.assessmentDetail.update({
        where: { id },
        data: { score: s.score, weightedScore: weighted },
      });
    } else {
      await prisma.assessmentDetail.create({
        data: {
          assessmentId,
          kpiSubcriteriaId: s.subcriteriaId,
          score: s.score,
          weightedScore: weighted,
        },
      });
    }
  }
}

export async function saveDraft(
  assessmentId: number,
  scores: ScoreInput[],
): Promise<ActionResult> {
  const loaded = await loadEditableAssessment(assessmentId);
  if (!loaded.ok) return { success: false, error: loaded.error };

  await persistScores(assessmentId, scores);
  revalidatePath("/");
  return { success: true };
}

export async function submitAssessment(
  assessmentId: number,
  scores: ScoreInput[],
): Promise<ActionResult> {
  const loaded = await loadEditableAssessment(assessmentId);
  if (!loaded.ok) return { success: false, error: loaded.error };
  const assessment = loaded.assessment;

  // Validasi: semua subkriteria template harus terisi.
  const template = await prisma.kpiTemplate.findUnique({
    where: { id: assessment.kpiTemplateId },
    include: { criteria: { include: { subcriteria: true } } },
  });
  const allSubIds =
    template?.criteria.flatMap((c) => c.subcriteria.map((s) => s.id)) ?? [];
  const scoreMap = new Map(scores.map((s) => [s.subcriteriaId, s.score]));
  const missing = allSubIds.filter(
    (id) => !scoreMap.has(id) || (scoreMap.get(id) ?? 0) < 1,
  );
  if (missing.length > 0) {
    return {
      success: false,
      error: `Masih ada ${missing.length} subkriteria yang belum dinilai.`,
    };
  }

  await persistScores(assessmentId, scores);
  await calculateScore(assessmentId);
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  await calculateFinalScore(assessment.periodId, assessment.assesseeId);

  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Hasil (untuk assessee melihat hasil diri sendiri)
// ---------------------------------------------------------------------------

export type MyResultCard = {
  periodId: number;
  periodName: string;
  isComplete: boolean;
  finalScore: number | null;
  category: string | null;
};

export async function getMyResults(): Promise<MyResultCard[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const period = await getActivePeriod();
  if (!period) return [];

  const fs = await prisma.assessmentFinalScore.findUnique({
    where: { periodId_assesseeId: { periodId: period.id, assesseeId: user.id } },
  });

  const finalScore = fs?.finalScore != null ? Number(fs.finalScore) : null;
  return [
    {
      periodId: period.id,
      periodName: period.name,
      isComplete: fs?.isComplete ?? false,
      finalScore,
      category: finalScore != null ? categoryOf(finalScore) : null,
    },
  ];
}

export type AssessorBreakdown = {
  label: string;
  weightPct: number;
  submitted: boolean;
  totalScore: number | null;
  contribution: number | null;
  details: {
    criteriaName: string;
    subName: string;
    score: number;
    ahpWeight: number;
    weighted: number;
  }[];
};

export type MyResultDetail = {
  assessee: {
    name: string;
    jabatanName: string;
    departmentName: string;
    branchName: string;
  };
  periodName: string;
  isComplete: boolean;
  finalScore: number | null;
  category: string | null;
  breakdown: AssessorBreakdown[];
};

export async function getMyResultDetail(
  periodId: number,
): Promise<MyResultDetail | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return buildResultDetail(periodId, user.id);
}

/** Bangun rincian hasil per penilai untuk assessee tertentu. */
async function buildResultDetail(
  periodId: number,
  assesseeId: number,
): Promise<MyResultDetail | null> {
  const [assessee, period] = await Promise.all([
    prisma.user.findUnique({
      where: { id: assesseeId },
      include: { branch: true, department: true, jabatan: true },
    }),
    prisma.period.findUnique({ where: { id: periodId } }),
  ]);
  if (!assessee || !period) return null;

  const slots = expectedSlots(assessee.role, assessee.branch?.isPusat ?? false);

  const assessments = await prisma.assessment.findMany({
    where: { periodId, assesseeId },
    include: {
      details: {
        include: { kpiSubcriteria: { include: { criteria: true } } },
      },
    },
  });
  const byWeight = new Map(assessments.map((a) => [a.weightPct, a]));

  const fs = await prisma.assessmentFinalScore.findUnique({
    where: { periodId_assesseeId: { periodId, assesseeId } },
  });
  const finalScore = fs?.finalScore != null ? Number(fs.finalScore) : null;

  const breakdown: AssessorBreakdown[] = slots.map((slot) => {
    const a = byWeight.get(slot.weightPct);
    const submitted = a?.status === "SUBMITTED";
    if (!a || !submitted) {
      return {
        label: slot.label,
        weightPct: slot.weightPct,
        submitted: false,
        totalScore: null,
        contribution: null,
        details: [],
      };
    }
    const totalScore = Number(a.totalScore ?? 0);
    const details = a.details
      .slice()
      .sort(
        (x, y) =>
          x.kpiSubcriteria.criteria.orderNumber -
            y.kpiSubcriteria.criteria.orderNumber ||
          x.kpiSubcriteria.orderNumber - y.kpiSubcriteria.orderNumber,
      )
      .map((d) => ({
        criteriaName: d.kpiSubcriteria.criteria.name,
        subName: d.kpiSubcriteria.name,
        score: d.score,
        ahpWeight: Number(d.kpiSubcriteria.globalWeight ?? 0),
        weighted: Number(d.weightedScore),
      }));
    return {
      label: slot.label,
      weightPct: slot.weightPct,
      submitted: true,
      totalScore,
      contribution: totalScore * (slot.weightPct / 100),
      details,
    };
  });

  return {
    assessee: {
      name: assessee.name,
      jabatanName: assessee.jabatan?.name ?? "—",
      departmentName: assessee.department?.name ?? "—",
      branchName: assessee.branch?.name ?? "—",
    },
    periodName: period.name,
    isComplete: fs?.isComplete ?? false,
    finalScore,
    category: finalScore != null ? categoryOf(finalScore) : null,
    breakdown,
  };
}
