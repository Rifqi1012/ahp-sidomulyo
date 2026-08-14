"use server";

import type { KpiType, Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-guard";
import { categoryOf, getKpiTypeForAssessee } from "@/lib/assessmentService";

const HISTORY_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type AssessmentResult = {
  finalScoreId: number;
  assesseeId: number;
  name: string;
  jabatanName: string;
  finalScore: number | null;
  isComplete: boolean;
  category: string | null;
};

export type ReportByPeriod = {
  period: { name: string; startDate: string; endDate: string };
  summary: {
    totalAssessed: number;
    avgScore: number;
    highest: number;
    lowest: number;
    distribution: {
      sangatBaik: number;
      baik: number;
      cukup: number;
      kurang: number;
      sangatKurang: number;
    };
  };
  byBranch: {
    branchName: string;
    avgScore: number;
    count: number;
    kepalaCabang: AssessmentResult[];
    kepalaDivisi: AssessmentResult[];
    karyawan: AssessmentResult[];
  }[];
};

export type PeriodOption = { id: number; name: string };
export type BranchOption = { id: number; name: string };

export async function getReportPeriods(): Promise<PeriodOption[]> {
  const periods = await prisma.period.findMany({
    where: { status: { in: ["ACTIVE", "CLOSED"] } },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true },
  });
  return periods;
}

export async function getReportBranches(): Promise<BranchOption[]> {
  return prisma.branch.findMany({
    orderBy: [{ isPusat: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

// ---------------------------------------------------------------------------
// 1. Laporan per periode
// ---------------------------------------------------------------------------

export async function getReportByPeriod(
  periodId: number,
): Promise<ReportByPeriod | null> {
  const user = await getSessionUser();
  if (!user || !["hrd", "direktur"].includes(user.role)) return null;

  const period = await prisma.period.findUnique({ where: { id: periodId } });
  if (!period) return null;

  const finals = await prisma.assessmentFinalScore.findMany({
    where: { periodId },
    include: {
      assessee: { include: { branch: true, jabatan: true } },
    },
  });

  const complete = finals.filter(
    (f) => f.isComplete && f.finalScore != null,
  );
  const scores = complete.map((f) => Number(f.finalScore));
  const totalAssessed = complete.length;
  const avgScore =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;

  const distribution = {
    sangatBaik: 0,
    baik: 0,
    cukup: 0,
    kurang: 0,
    sangatKurang: 0,
  };
  for (const s of scores) {
    if (s >= 4.5) distribution.sangatBaik++;
    else if (s >= 3.5) distribution.baik++;
    else if (s >= 2.5) distribution.cukup++;
    else if (s >= 1.5) distribution.kurang++;
    else distribution.sangatKurang++;
  }

  // Group per branch.
  const branchMap = new Map<
    number,
    {
      branchName: string;
      kepalaCabang: AssessmentResult[];
      kepalaDivisi: AssessmentResult[];
      karyawan: AssessmentResult[];
      scores: number[];
    }
  >();

  for (const f of finals) {
    const branchId = f.assessee.branchId ?? -1;
    const branchName = f.assessee.branch?.name ?? "Tanpa Cabang";
    if (!branchMap.has(branchId)) {
      branchMap.set(branchId, {
        branchName,
        kepalaCabang: [],
        kepalaDivisi: [],
        karyawan: [],
        scores: [],
      });
    }
    const entry = branchMap.get(branchId)!;
    const finalScore = f.finalScore != null ? Number(f.finalScore) : null;
    const row: AssessmentResult = {
      finalScoreId: f.id,
      assesseeId: f.assesseeId,
      name: f.assessee.name,
      jabatanName: f.assessee.jabatan?.name ?? "—",
      finalScore,
      isComplete: f.isComplete,
      category: finalScore != null ? categoryOf(finalScore) : null,
    };
    if (f.assessee.role === "kepala_cabang") entry.kepalaCabang.push(row);
    else if (f.assessee.role === "kepala_divisi") entry.kepalaDivisi.push(row);
    else if (f.assessee.role === "karyawan") entry.karyawan.push(row);
    if (finalScore != null && f.isComplete) entry.scores.push(finalScore);
  }

  const byBranch = Array.from(branchMap.values()).map((b) => ({
    branchName: b.branchName,
    avgScore:
      b.scores.length > 0
        ? b.scores.reduce((a, c) => a + c, 0) / b.scores.length
        : 0,
    count:
      b.kepalaCabang.length + b.kepalaDivisi.length + b.karyawan.length,
    kepalaCabang: b.kepalaCabang,
    kepalaDivisi: b.kepalaDivisi,
    karyawan: b.karyawan,
  }));

  return {
    period: {
      name: period.name,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
    },
    summary: {
      totalAssessed,
      avgScore,
      highest,
      lowest,
      distribution,
    },
    byBranch,
  };
}

// ---------------------------------------------------------------------------
// 2. Detail satu orang (untuk PDF)
// ---------------------------------------------------------------------------

export type PdfSub = {
  name: string;
  description: string;
  withinPercent: number; // bobot subkriteria di dalam kriteria (%)
  globalPercent: number; // bobot global (%) = ahpWeight × 100
  p1Score: number | null;
  p2Score: number | null;
  blended: number; // skor gabungan 1–5
  weightedScore: number; // blended × ahpWeight (kontribusi)
};

export type PdfCriteria = {
  name: string;
  bobotPercent: number; // bobot kriteria (%) = Σ ahpWeight × 100
  criteriaTotal: number; // skor kriteria 1–5
  contribution: number; // Σ weightedScore
  subcriteria: PdfSub[];
};

export type PdfPenilai = {
  name: string;
  jabatanName: string;
  weightPct: number;
  submitted: boolean;
};

export type AssessmentDetailData = {
  finalScoreId: number;
  kpiType: KpiType;
  isComplete: boolean;
  finalScore: number;
  category: string;
  assessee: {
    name: string;
    jabatanName: string;
    departmentName: string;
    branchName: string;
    hireDate: string | null;
  };
  period: {
    name: string;
    startDate: string;
    endDate: string;
    status: "DRAFT" | "ACTIVE" | "CLOSED";
  };
  penilai1: PdfPenilai | null;
  penilai2: PdfPenilai | null;
  submittedAt: string | null;
  criteria: PdfCriteria[];
};

export async function getAssessmentDetail(
  finalScoreId: number,
): Promise<AssessmentDetailData | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const fs = await prisma.assessmentFinalScore.findUnique({
    where: { id: finalScoreId },
    include: {
      assessee: { include: { branch: true, department: true, jabatan: true } },
      period: true,
    },
  });
  if (!fs) return null;

  const assessee = fs.assessee;

  // Otorisasi: hrd/direktur penuh; selain itu hanya diri sendiri atau penilai.
  const assessments = await prisma.assessment.findMany({
    where: { periodId: fs.periodId, assesseeId: fs.assesseeId },
    include: {
      assessor: { include: { jabatan: true } },
      details: { include: { kpiSubcriteria: { include: { criteria: true } } } },
    },
  });
  const isAssessor = assessments.some((a) => a.assessorId === user.id);
  const allowed =
    ["hrd", "direktur"].includes(user.role) ||
    user.id === fs.assesseeId ||
    isAssessor;
  if (!allowed) return null;

  const kpiType = getKpiTypeForAssessee(assessee.role);

  const p1 = assessments.find((a) => a.weightPct < 50) ?? null;
  const p2 = assessments.find((a) => a.weightPct >= 50) ?? null;
  const wp1 = p1?.weightPct ?? 0;
  const wp2 = p2?.weightPct ?? 0;

  const templateId = (p2 ?? p1)?.kpiTemplateId;
  if (!templateId) return null;
  const template = await prisma.kpiTemplate.findUnique({
    where: { id: templateId },
    include: {
      criteria: {
        orderBy: { orderNumber: "asc" },
        include: { subcriteria: { orderBy: { orderNumber: "asc" } } },
      },
    },
  });
  if (!template) return null;

  const scoreOf = (a: typeof p1, subId: number): number | null => {
    if (!a) return null;
    const d = a.details.find((x) => x.kpiSubcriteriaId === subId);
    return d ? d.score : null;
  };

  const criteria: PdfCriteria[] = template.criteria.map((c) => {
    const criteriaShare = c.subcriteria.reduce(
      (s, x) => s + Number(x.globalWeight ?? 0),
      0,
    );
    let contribution = 0;
    const subcriteria: PdfSub[] = c.subcriteria.map((s) => {
      const ahp = Number(s.globalWeight ?? 0); // bobot global untuk skoring
      const s1 = scoreOf(p1, s.id);
      const s2 = scoreOf(p2, s.id);
      const blended =
        (s1 != null ? (s1 * wp1) / 100 : 0) +
        (s2 != null ? (s2 * wp2) / 100 : 0);
      const weightedScore = blended * ahp;
      contribution += weightedScore;
      return {
        name: s.name,
        description: s.description ?? "",
        withinPercent: Number(s.ahpWeight ?? 0) * 100,
        globalPercent: ahp * 100,
        p1Score: s1,
        p2Score: s2,
        blended,
        weightedScore,
      };
    });
    return {
      name: c.name,
      bobotPercent: criteriaShare * 100,
      criteriaTotal: criteriaShare > 0 ? contribution / criteriaShare : 0,
      contribution,
      subcriteria,
    };
  });

  const finalScore =
    fs.finalScore != null
      ? Number(fs.finalScore)
      : criteria.reduce((s, c) => s + c.contribution, 0);

  const mkPenilai = (a: typeof p1): PdfPenilai | null =>
    a
      ? {
          name: a.assessor.name,
          jabatanName: a.assessor.jabatan?.name ?? "—",
          weightPct: a.weightPct,
          submitted: a.status === "SUBMITTED",
        }
      : null;

  const submittedAt =
    [p1, p2]
      .map((a) => a?.submittedAt)
      .filter(Boolean)
      .sort()
      .pop() ?? null;

  return {
    finalScoreId,
    kpiType,
    isComplete: fs.isComplete,
    finalScore,
    category: categoryOf(finalScore),
    assessee: {
      name: assessee.name,
      jabatanName: assessee.jabatan?.name ?? "—",
      departmentName: assessee.department?.name ?? "—",
      branchName: assessee.branch?.name ?? "—",
      hireDate: assessee.hireDate ? assessee.hireDate.toISOString() : null,
    },
    period: {
      name: fs.period.name,
      startDate: fs.period.startDate.toISOString(),
      endDate: fs.period.endDate.toISOString(),
      status: fs.period.status,
    },
    penilai1: mkPenilai(p1),
    penilai2: mkPenilai(p2),
    submittedAt: submittedAt ? new Date(submittedAt).toISOString() : null,
    criteria,
  };
}

/** Detail hasil penilaian milik user yang login untuk satu periode. */
export async function getMyAssessmentDetail(
  periodId: number,
): Promise<AssessmentDetailData | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const fs = await prisma.assessmentFinalScore.findUnique({
    where: { periodId_assesseeId: { periodId, assesseeId: user.id } },
    select: { id: true },
  });
  return fs ? getAssessmentDetail(fs.id) : null;
}

// ---------------------------------------------------------------------------
// 3. History
// ---------------------------------------------------------------------------

export type HistoryRow = {
  finalScoreId: number;
  name: string;
  jabatanName: string;
  branchName: string;
  periodName: string;
  penilai1Name: string | null;
  penilai1Score: number | null;
  penilai2Name: string | null;
  penilai2Score: number | null;
  finalScore: number | null;
  isComplete: boolean;
  category: string | null;
};

export type HistoryFilter = {
  periodId?: number;
  branchId?: number;
  jabatanLevel?: "atas" | "bawah";
  search?: string;
  page?: number;
};

export type HistoryResult = {
  rows: HistoryRow[];
  total: number;
  page: number;
  pageCount: number;
};

export async function getHistory(
  filter: HistoryFilter = {},
): Promise<HistoryResult> {
  const user = await getSessionUser();
  if (!user) return { rows: [], total: 0, page: 1, pageCount: 1 };

  const page = Math.max(1, filter.page ?? 1);

  // Scoping per role.
  const assesseeWhere: Record<string, unknown> = {};
  let periodFilter: number | undefined = filter.periodId;

  if (user.role === "kepala_cabang") {
    assesseeWhere.branchId = user.branchId ?? -1;
    const active = await prisma.period.findFirst({ where: { status: "ACTIVE" } });
    periodFilter = active?.id ?? -1;
  } else if (user.role === "kepala_divisi") {
    assesseeWhere.branchId = user.branchId ?? -1;
    assesseeWhere.departmentId = user.departmentId ?? -1;
    const active = await prisma.period.findFirst({ where: { status: "ACTIVE" } });
    periodFilter = active?.id ?? -1;
  } else if (!["hrd", "direktur"].includes(user.role)) {
    return { rows: [], total: 0, page: 1, pageCount: 1 };
  }

  if (filter.branchId) assesseeWhere.branchId = filter.branchId;
  if (filter.jabatanLevel === "atas") {
    assesseeWhere.role = { in: ["kepala_cabang", "kepala_divisi"] };
  } else if (filter.jabatanLevel === "bawah") {
    assesseeWhere.role = "karyawan";
  }
  if (filter.search) {
    assesseeWhere.name = { contains: filter.search };
  }

  const where = {
    ...(periodFilter ? { periodId: periodFilter } : {}),
    assessee: assesseeWhere,
  };

  const [total, finals] = await Promise.all([
    prisma.assessmentFinalScore.count({ where }),
    prisma.assessmentFinalScore.findMany({
      where,
      include: {
        assessee: { include: { branch: true, jabatan: true } },
        period: true,
      },
      orderBy: [{ periodId: "desc" }, { assesseeId: "asc" }],
      skip: (page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
    }),
  ]);

  // Ambil penilai untuk baris pada halaman ini.
  const keys = finals.map((f) => ({ periodId: f.periodId, assesseeId: f.assesseeId }));
  const assessments = await prisma.assessment.findMany({
    where: {
      OR: keys.map((k) => ({ periodId: k.periodId, assesseeId: k.assesseeId })),
    },
    include: { assessor: true },
  });

  const rows: HistoryRow[] = finals.map((f) => {
    const related = assessments.filter(
      (a) => a.periodId === f.periodId && a.assesseeId === f.assesseeId,
    );
    const p1 = related.find((a) => a.weightPct < 50) ?? null;
    const p2 = related.find((a) => a.weightPct >= 50) ?? null;
    const finalScore = f.finalScore != null ? Number(f.finalScore) : null;
    return {
      finalScoreId: f.id,
      name: f.assessee.name,
      jabatanName: f.assessee.jabatan?.name ?? "—",
      branchName: f.assessee.branch?.name ?? "—",
      periodName: f.period.name,
      penilai1Name: p1?.assessor.name ?? null,
      penilai1Score:
        p1?.totalScore != null && p1.status === "SUBMITTED"
          ? Number(p1.totalScore)
          : null,
      penilai2Name: p2?.assessor.name ?? null,
      penilai2Score:
        p2?.totalScore != null && p2.status === "SUBMITTED"
          ? Number(p2.totalScore)
          : null,
      finalScore,
      isComplete: f.isComplete,
      category:
        f.isComplete && finalScore != null ? categoryOf(finalScore) : null,
    };
  });

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
  };
}

// ---------------------------------------------------------------------------
// Rekap penilaian (multi-periode) untuk halaman Laporan baru
// ---------------------------------------------------------------------------

export type RekapCriteriaScore = { criteriaName: string; totalScore: number };

export type RekapPeriodScore = {
  periodId: number;
  periodName: string;
  finalScoreId: number | null;
  kriteriaScores: RekapCriteriaScore[];
  finalScore: number | null;
  isComplete: boolean;
};

export type RekapRow = {
  userId: number;
  nik: string;
  name: string;
  jabatan: string;
  cabang: string;
  departemen: string;
  periodeScores: RekapPeriodScore[];
};

export type RekapFilter = {
  type: KpiType;
  periodIds: number[];
  branchId?: number;
  search?: string;
};

export async function getAvailablePeriods(): Promise<PeriodOption[]> {
  return getReportPeriods();
}

export async function getRekapData(filter: RekapFilter): Promise<RekapRow[]> {
  const user = await getSessionUser();
  if (!user) return [];
  if (filter.periodIds.length === 0) return [];

  const roles: Prisma.UserWhereInput["role"] =
    filter.type === "atas"
      ? { in: ["kepala_cabang", "kepala_divisi"] }
      : "karyawan";

  const where: Prisma.UserWhereInput = { role: roles };
  if (user.role === "hrd") {
    if (filter.branchId) where.branchId = filter.branchId;
  } else if (user.role === "kepala_cabang") {
    where.branchId = user.branchId ?? -1;
  } else if (user.role === "kepala_divisi") {
    if (filter.type === "atas") return []; // KD tidak punya tab atas
    where.branchId = user.branchId ?? -1;
    where.departmentId = user.departmentId ?? -1;
  } else {
    return [];
  }
  if (filter.search) where.name = { contains: filter.search };

  const assessees = await prisma.user.findMany({
    where,
    include: { jabatan: true, branch: true, department: true },
    orderBy: { name: "asc" },
  });
  if (assessees.length === 0) return [];

  const ids = assessees.map((a) => a.id);
  const [finals, assessments, periods] = await Promise.all([
    prisma.assessmentFinalScore.findMany({
      where: { periodId: { in: filter.periodIds }, assesseeId: { in: ids } },
    }),
    prisma.assessment.findMany({
      where: { periodId: { in: filter.periodIds }, assesseeId: { in: ids } },
      include: {
        details: { include: { kpiSubcriteria: { include: { criteria: true } } } },
      },
    }),
    prisma.period.findMany({
      where: { id: { in: filter.periodIds } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const finalMap = new Map(finals.map((f) => [`${f.periodId}-${f.assesseeId}`, f]));
  const asmMap = new Map<string, typeof assessments>();
  for (const a of assessments) {
    const k = `${a.periodId}-${a.assesseeId}`;
    const arr = asmMap.get(k);
    if (arr) arr.push(a);
    else asmMap.set(k, [a]);
  }

  return assessees.map((emp) => {
    const periodeScores: RekapPeriodScore[] = periods.map((per) => {
      const key = `${per.id}-${emp.id}`;
      const f = finalMap.get(key);
      const asm = asmMap.get(key) ?? [];
      const p1 = asm.find((a) => a.weightPct < 50);
      const p2 = asm.find((a) => a.weightPct >= 50);
      const wp1 = p1?.weightPct ?? 0;
      const wp2 = p2?.weightPct ?? 0;

      // Blended per subkriteria → kontribusi per kriteria.
      const subMap = new Map<
        number,
        { ahp: number; criteriaName: string; order: number; s1: number | null; s2: number | null }
      >();
      for (const d of p1?.details ?? []) {
        subMap.set(d.kpiSubcriteriaId, {
          ahp: Number(d.kpiSubcriteria.globalWeight ?? 0),
          criteriaName: d.kpiSubcriteria.criteria.name,
          order: d.kpiSubcriteria.criteria.orderNumber,
          s1: d.score,
          s2: null,
        });
      }
      for (const d of p2?.details ?? []) {
        const e = subMap.get(d.kpiSubcriteriaId);
        if (e) e.s2 = d.score;
        else
          subMap.set(d.kpiSubcriteriaId, {
            ahp: Number(d.kpiSubcriteria.globalWeight ?? 0),
            criteriaName: d.kpiSubcriteria.criteria.name,
            order: d.kpiSubcriteria.criteria.orderNumber,
            s1: null,
            s2: d.score,
          });
      }
      const critMap = new Map<string, { order: number; total: number }>();
      for (const e of Array.from(subMap.values())) {
        const blended =
          (e.s1 != null ? (e.s1 * wp1) / 100 : 0) +
          (e.s2 != null ? (e.s2 * wp2) / 100 : 0);
        const cur = critMap.get(e.criteriaName) ?? { order: e.order, total: 0 };
        cur.total += blended * e.ahp;
        cur.order = e.order;
        critMap.set(e.criteriaName, cur);
      }
      const kriteriaScores = Array.from(critMap.entries())
        .sort((a, b) => a[1].order - b[1].order)
        .map(([criteriaName, v]) => ({ criteriaName, totalScore: v.total }));

      return {
        periodId: per.id,
        periodName: per.name,
        finalScoreId: f?.id ?? null,
        kriteriaScores,
        finalScore: f?.finalScore != null ? Number(f.finalScore) : null,
        isComplete: f?.isComplete ?? false,
      };
    });

    return {
      userId: emp.id,
      nik: emp.nik ?? "-",
      name: emp.name,
      jabatan: emp.jabatan?.name ?? "-",
      cabang: emp.branch?.name ?? "-",
      departemen: emp.department?.name ?? "-",
      periodeScores,
    };
  });
}

// ---------------------------------------------------------------------------
// Perankingan (satu periode)
// ---------------------------------------------------------------------------

export type RankingRow = {
  rank: number | null;
  userId: number;
  finalScoreId: number | null;
  name: string;
  jabatan: string;
  cabang: string;
  departemen: string;
  finalScore: number | null;
  category: string | null;
  isComplete: boolean;
};

export type RankingFilter = {
  type: KpiType;
  periodId: number;
  branchId?: number;
  search?: string;
};

export async function getRanking(
  filter: RankingFilter,
): Promise<RankingRow[]> {
  const user = await getSessionUser();
  if (!user || !filter.periodId) return [];

  const roles: Prisma.UserWhereInput["role"] =
    filter.type === "atas"
      ? { in: ["kepala_cabang", "kepala_divisi"] }
      : "karyawan";

  const where: Prisma.UserWhereInput = { role: roles };
  if (user.role === "hrd" || user.role === "direktur") {
    if (filter.branchId) where.branchId = filter.branchId;
  } else if (user.role === "kepala_cabang") {
    where.branchId = user.branchId ?? -1;
  } else if (user.role === "kepala_divisi") {
    if (filter.type === "atas") return [];
    where.branchId = user.branchId ?? -1;
    where.departmentId = user.departmentId ?? -1;
  } else {
    return [];
  }
  if (filter.search) where.name = { contains: filter.search };

  const assessees = await prisma.user.findMany({
    where,
    include: { jabatan: true, branch: true, department: true },
  });
  if (assessees.length === 0) return [];

  const ids = assessees.map((a) => a.id);
  const finals = await prisma.assessmentFinalScore.findMany({
    where: { periodId: filter.periodId, assesseeId: { in: ids } },
  });
  const finalMap = new Map(finals.map((f) => [f.assesseeId, f]));

  const rows = assessees.map((emp) => {
    const f = finalMap.get(emp.id);
    const complete = (f?.isComplete ?? false) && f?.finalScore != null;
    const finalScore = complete ? Number(f!.finalScore) : null;
    return {
      userId: emp.id,
      finalScoreId: f?.id ?? null,
      name: emp.name,
      jabatan: emp.jabatan?.name ?? "-",
      cabang: emp.branch?.name ?? "-",
      departemen: emp.department?.name ?? "-",
      finalScore,
      category: finalScore != null ? categoryOf(finalScore) : null,
      isComplete: complete,
    };
  });

  // Yang lengkap diurutkan menurun & diberi peringkat; sisanya di bawah.
  const ranked = rows
    .filter((r) => r.finalScore != null)
    .sort((a, b) => b.finalScore! - a.finalScore!)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const unranked = rows
    .filter((r) => r.finalScore == null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => ({ ...r, rank: null }));

  return [...ranked, ...unranked];
}

// ---------------------------------------------------------------------------
// Target hasil periode AKTIF untuk KC/KD/Karyawan
// ---------------------------------------------------------------------------

/**
 * periodId = id periode aktif jika user sudah punya hasil di sana (siap
 * di-redirect ke detail). hasActivePeriod membedakan "tidak ada periode aktif"
 * vs "ada periode aktif tapi hasil belum tersedia".
 */
export async function getActiveResultTarget(): Promise<{
  periodId: number | null;
  hasActivePeriod: boolean;
}> {
  const user = await getSessionUser();
  if (!user) return { periodId: null, hasActivePeriod: false };

  const active = await prisma.period.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  if (!active) return { periodId: null, hasActivePeriod: false };

  const fs = await prisma.assessmentFinalScore.findUnique({
    where: { periodId_assesseeId: { periodId: active.id, assesseeId: user.id } },
    select: { id: true },
  });
  return { periodId: fs ? active.id : null, hasActivePeriod: true };
}
