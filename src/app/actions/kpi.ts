"use server";

import { revalidatePath } from "next/cache";
import type { KpiType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isHrd, getSessionUser } from "@/lib/auth-guard";
import { calculateAhpFromMatrix, calculateGlobalWeights } from "@/lib/ahp";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Comp = { subcriteriaIId: number; subcriteriaJId: number; value: number };

function buildMatrix(subIds: number[], comps: Comp[]): number[][] {
  const n = subIds.length;
  const idx = new Map(subIds.map((id, i) => [id, i]));
  const m = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j): number => (i === j ? 1 : 0)),
  );
  for (const c of comps) {
    const i = idx.get(c.subcriteriaIId);
    const j = idx.get(c.subcriteriaJId);
    if (i == null || j == null) continue;
    const v = Number(c.value);
    m[i][j] = v;
    m[j][i] = v !== 0 ? 1 / v : 0;
  }
  return m;
}

export type AhpStatus = "empty" | "inconsistent" | "consistent";

function statusOf(
  subIds: number[],
  comps: Comp[],
): { status: AhpStatus; cr: number | null } {
  const n = subIds.length;
  if (n < 2) return { status: "consistent", cr: 0 };
  if (comps.length < (n * (n - 1)) / 2) return { status: "empty", cr: null };
  const r = calculateAhpFromMatrix(buildMatrix(subIds, comps));
  return { status: r.isConsistent ? "consistent" : "inconsistent", cr: r.cr };
}

async function getCurrentTemplate(type: KpiType) {
  return prisma.kpiTemplate.findFirst({
    where: { type, isCurrent: true },
    include: {
      criteria: {
        orderBy: { orderNumber: "asc" },
        include: {
          subcriteria: { orderBy: { orderNumber: "asc" } },
          comparisons: true,
        },
      },
    },
  });
}

async function resetCriteriaAhp(criteriaId: number) {
  await prisma.ahpComparison.deleteMany({ where: { kpiCriteriaId: criteriaId } });
  await prisma.kpiSubcriteria.updateMany({
    where: { kpiCriteriaId: criteriaId },
    data: { ahpWeight: null },
  });
}

// ---------------------------------------------------------------------------
// Step 1: struktur KPI
// ---------------------------------------------------------------------------

export type KpiSubItem = {
  id: number;
  name: string;
  description: string;
  ahpWeight: number | null;
};
export type KpiCritItem = {
  id: number;
  name: string;
  subcriteria: KpiSubItem[];
  ahpStatus: AhpStatus;
  cr: number | null;
};
export type KpiStructure = {
  templateId: number;
  version: number;
  createdAt: string;
  type: KpiType;
  criteria: KpiCritItem[];
};

export async function getKpiStructure(
  type: KpiType,
): Promise<KpiStructure | null> {
  const t = await getCurrentTemplate(type);
  if (!t) return null;
  return {
    templateId: t.id,
    version: t.version,
    createdAt: t.createdAt.toISOString(),
    type: t.type,
    criteria: t.criteria.map((c) => {
      const subIds = c.subcriteria.map((s) => s.id);
      const comps = c.comparisons.map((x) => ({
        subcriteriaIId: x.subcriteriaIId,
        subcriteriaJId: x.subcriteriaJId,
        value: Number(x.value),
      }));
      const { status, cr } = statusOf(subIds, comps);
      return {
        id: c.id,
        name: c.name,
        subcriteria: c.subcriteria.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? "",
          ahpWeight: s.ahpWeight != null ? Number(s.ahpWeight) : null,
        })),
        ahpStatus: status,
        cr,
      };
    }),
  };
}

async function guard(): Promise<ActionResult | null> {
  return (await isHrd()) ? null : { success: false, error: "Anda tidak memiliki akses." };
}

export async function addCriteria(
  type: KpiType,
  name: string,
): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  if (!name.trim()) return { success: false, error: "Nama kriteria wajib diisi." };
  const t = await getCurrentTemplate(type);
  if (!t) return { success: false, error: "Template KPI tidak ditemukan." };
  await prisma.kpiCriteria.create({
    data: {
      kpiTemplateId: t.id,
      name: name.trim(),
      orderNumber: t.criteria.length + 1,
    },
  });
  revalidatePath(`/hrd/kpi/${type}`);
  return { success: true };
}

export async function updateCriteria(
  id: number,
  name: string,
): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  if (!name.trim()) return { success: false, error: "Nama kriteria wajib diisi." };
  await prisma.kpiCriteria.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/hrd/kpi/atas");
  revalidatePath("/hrd/kpi/bawah");
  return { success: true };
}

export async function deleteCriteria(id: number): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  await prisma.ahpComparison.deleteMany({ where: { kpiCriteriaId: id } });
  await prisma.kpiSubcriteria.deleteMany({ where: { kpiCriteriaId: id } });
  await prisma.kpiCriteria.delete({ where: { id } });
  revalidatePath("/hrd/kpi/atas");
  revalidatePath("/hrd/kpi/bawah");
  return { success: true };
}

export async function addSubcriteria(
  criteriaId: number,
  data: { name: string; description: string },
): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  if (!data.name.trim())
    return { success: false, error: "Nama subkriteria wajib diisi." };
  const count = await prisma.kpiSubcriteria.count({
    where: { kpiCriteriaId: criteriaId },
  });
  await prisma.kpiSubcriteria.create({
    data: {
      kpiCriteriaId: criteriaId,
      name: data.name.trim(),
      description: data.description.trim() || null,
      orderNumber: count + 1,
    },
  });
  // Struktur berubah → reset AHP kriteria ini.
  await resetCriteriaAhp(criteriaId);
  revalidatePath("/hrd/kpi/atas");
  revalidatePath("/hrd/kpi/bawah");
  return { success: true };
}

export async function updateSubcriteria(
  id: number,
  data: { name: string; description: string },
): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  if (!data.name.trim())
    return { success: false, error: "Nama subkriteria wajib diisi." };
  await prisma.kpiSubcriteria.update({
    where: { id },
    data: { name: data.name.trim(), description: data.description.trim() || null },
  });
  revalidatePath("/hrd/kpi/atas");
  revalidatePath("/hrd/kpi/bawah");
  return { success: true };
}

export async function deleteSubcriteria(id: number): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  const sub = await prisma.kpiSubcriteria.findUnique({ where: { id } });
  if (!sub) return { success: false, error: "Subkriteria tidak ditemukan." };
  await prisma.kpiSubcriteria.delete({ where: { id } });
  await resetCriteriaAhp(sub.kpiCriteriaId);
  revalidatePath("/hrd/kpi/atas");
  revalidatePath("/hrd/kpi/bawah");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 2: perbandingan AHP
// ---------------------------------------------------------------------------

export type ComparisonInput = {
  subIId: number;
  subJId: number;
  value: number;
};

export type SaveComparisonsResult = {
  weights: { id: number; name: string; weight: number }[];
  lambdaMax: number;
  ci: number;
  cr: number;
  isConsistent: boolean;
};

export async function getComparisons(
  criteriaId: number,
): Promise<ComparisonInput[]> {
  const comps = await prisma.ahpComparison.findMany({
    where: { kpiCriteriaId: criteriaId },
  });
  return comps.map((c) => ({
    subIId: c.subcriteriaIId,
    subJId: c.subcriteriaJId,
    value: Number(c.value),
  }));
}

export type SaveComparisonsReturn =
  | { ok: false; error: string }
  | { ok: true; result: SaveComparisonsResult };

export async function saveComparisons(
  criteriaId: number,
  comparisons: ComparisonInput[],
): Promise<SaveComparisonsReturn> {
  if (!(await isHrd())) return { ok: false, error: "Anda tidak memiliki akses." };

  const subs = await prisma.kpiSubcriteria.findMany({
    where: { kpiCriteriaId: criteriaId },
    orderBy: { orderNumber: "asc" },
  });
  const subIds = subs.map((s) => s.id);

  // Simpan comparisons (replace).
  await prisma.ahpComparison.deleteMany({ where: { kpiCriteriaId: criteriaId } });
  if (comparisons.length > 0) {
    await prisma.ahpComparison.createMany({
      data: comparisons.map((c) => ({
        kpiCriteriaId: criteriaId,
        subcriteriaIId: c.subIId,
        subcriteriaJId: c.subJId,
        value: c.value,
      })),
    });
  }

  const r = calculateAhpFromMatrix(
    buildMatrix(
      subIds,
      comparisons.map((c) => ({
        subcriteriaIId: c.subIId,
        subcriteriaJId: c.subJId,
        value: c.value,
      })),
    ),
  );

  // Simpan bobot hanya jika konsisten.
  if (r.isConsistent) {
    for (let i = 0; i < subIds.length; i++) {
      await prisma.kpiSubcriteria.update({
        where: { id: subIds[i] },
        data: { ahpWeight: Number((r.weights[i] ?? 0).toFixed(6)) },
      });
    }
  } else {
    await prisma.kpiSubcriteria.updateMany({
      where: { kpiCriteriaId: criteriaId },
      data: { ahpWeight: null },
    });
  }

  revalidatePath("/hrd/kpi/atas");
  revalidatePath("/hrd/kpi/bawah");
  return {
    ok: true,
    result: {
      weights: subs.map((s, i) => ({
        id: s.id,
        name: s.name,
        weight: r.weights[i] ?? 0,
      })),
      lambdaMax: r.lambdaMax,
      ci: r.ci,
      cr: r.cr,
      isConsistent: r.isConsistent,
    },
  };
}

export type SaveAllResult =
  | { success: true; newVersion: number }
  | { success: false; error: string };

export async function saveAllAndCreateVersion(
  type: KpiType,
): Promise<SaveAllResult> {
  const user = await getSessionUser();
  if (!user || !(await isHrd()))
    return { success: false, error: "Anda tidak memiliki akses." };

  const t = await getCurrentTemplate(type);
  if (!t) return { success: false, error: "Template KPI tidak ditemukan." };
  if (t.criteria.length === 0)
    return { success: false, error: "Belum ada kriteria." };

  // Validasi: semua kriteria konsisten.
  for (const c of t.criteria) {
    if (c.subcriteria.length === 0)
      return {
        success: false,
        error: `Kriteria "${c.name}" belum punya subkriteria.`,
      };
    const subIds = c.subcriteria.map((s) => s.id);
    const comps = c.comparisons.map((x) => ({
      subcriteriaIId: x.subcriteriaIId,
      subcriteriaJId: x.subcriteriaJId,
      value: Number(x.value),
    }));
    const { status } = statusOf(subIds, comps);
    if (status !== "consistent")
      return {
        success: false,
        error: `Kriteria "${c.name}" belum konsisten / belum diisi.`,
      };
  }

  // ahpWeight per sub (1 untuk kriteria 1-sub) + globalWeight.
  const critForGlobal = t.criteria.map((c) => ({
    subcriteria: c.subcriteria.map((s) => ({
      id: s.id,
      ahpWeight:
        c.subcriteria.length < 2 ? 1 : Number(s.ahpWeight ?? 0),
    })),
  }));
  const globalMap = calculateGlobalWeights(critForGlobal);

  const newTemplate = await prisma.$transaction(async (tx) => {
    await tx.kpiTemplate.update({
      where: { id: t.id },
      data: { isCurrent: false },
    });
    const created = await tx.kpiTemplate.create({
      data: {
        type,
        version: t.version + 1,
        isCurrent: true,
        createdBy: user.id,
      },
    });

    for (const c of t.criteria) {
      const newCrit = await tx.kpiCriteria.create({
        data: {
          kpiTemplateId: created.id,
          name: c.name,
          ahpWeight: Number((1 / t.criteria.length).toFixed(6)),
          orderNumber: c.orderNumber,
        },
      });
      const subIdMap = new Map<number, number>();
      for (const s of c.subcriteria) {
        const ahp = c.subcriteria.length < 2 ? 1 : Number(s.ahpWeight ?? 0);
        const newSub = await tx.kpiSubcriteria.create({
          data: {
            kpiCriteriaId: newCrit.id,
            name: s.name,
            description: s.description,
            ahpWeight: Number(ahp.toFixed(6)),
            globalWeight: Number((globalMap.get(s.id) ?? 0).toFixed(6)),
            orderNumber: s.orderNumber,
          },
        });
        subIdMap.set(s.id, newSub.id);
      }
      // Salin comparisons agar matriks tetap bisa dilihat.
      for (const cmp of c.comparisons) {
        const ni = subIdMap.get(cmp.subcriteriaIId);
        const nj = subIdMap.get(cmp.subcriteriaJId);
        if (ni && nj) {
          await tx.ahpComparison.create({
            data: {
              kpiCriteriaId: newCrit.id,
              subcriteriaIId: ni,
              subcriteriaJId: nj,
              value: cmp.value,
            },
          });
        }
      }
    }
    return created;
  });

  revalidatePath(`/hrd/kpi/${type}`);
  revalidatePath(`/hrd/kpi/${type}/ahp-result`);
  return { success: true, newVersion: newTemplate.version };
}

// ---------------------------------------------------------------------------
// Hasil AHP (untuk halaman /ahp-result)
// ---------------------------------------------------------------------------

export type AhpCriteriaResult = {
  name: string;
  subNames: string[];
  matrix: number[][];
  weights: { name: string; ahpWeight: number }[];
  lambdaMax: number;
  ci: number;
  cr: number;
};

export type AhpResultDTO = {
  version: number;
  createdAt: string;
  criteria: AhpCriteriaResult[];
  global: { name: string; globalWeight: number }[];
  globalTotal: number;
};

export async function getAhpResult(type: KpiType): Promise<AhpResultDTO | null> {
  const t = await getCurrentTemplate(type);
  if (!t) return null;

  const criteria: AhpCriteriaResult[] = t.criteria.map((c) => {
    const subIds = c.subcriteria.map((s) => s.id);
    const comps = c.comparisons.map((x) => ({
      subcriteriaIId: x.subcriteriaIId,
      subcriteriaJId: x.subcriteriaJId,
      value: Number(x.value),
    }));
    const matrix = buildMatrix(subIds, comps);
    const r = calculateAhpFromMatrix(matrix);
    return {
      name: c.name,
      subNames: c.subcriteria.map((s) => s.name),
      matrix,
      weights: c.subcriteria.map((s, i) => ({
        name: s.name,
        ahpWeight: r.weights[i] ?? Number(s.ahpWeight ?? 0),
      })),
      lambdaMax: r.lambdaMax,
      ci: r.ci,
      cr: r.cr,
    };
  });

  const global: { name: string; globalWeight: number }[] = [];
  let globalTotal = 0;
  for (const c of t.criteria) {
    for (const s of c.subcriteria) {
      const g = Number(s.globalWeight ?? 0);
      global.push({ name: s.name, globalWeight: g });
      globalTotal += g;
    }
  }

  return {
    version: t.version,
    createdAt: t.createdAt.toISOString(),
    criteria,
    global,
    globalTotal,
  };
}
