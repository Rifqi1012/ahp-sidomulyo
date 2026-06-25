"use server";

import { revalidatePath } from "next/cache";
import type { KpiType } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isHrd, getSessionUser } from "@/lib/auth-guard";
import {
  calculateAhpFromBobot,
  calculateGlobalAhpWeights,
} from "@/lib/ahp";

const TOTAL_TOLERANCE = 0.1;
const near100 = (n: number) => Math.abs(n - 100) <= TOTAL_TOLERANCE;

// ---------------------------------------------------------------------------
// Read: KPI saat ini
// ---------------------------------------------------------------------------

export type KpiSubDTO = {
  id: number;
  name: string;
  description: string;
  bobotPersen: number;
  ahpWeight: number;
  orderNumber: number;
};

export type KpiCriteriaDTO = {
  id: number;
  name: string;
  orderNumber: number;
  subcriteria: KpiSubDTO[];
};

export type KpiTemplateDTO = {
  id: number;
  type: KpiType;
  version: number;
  createdAt: string;
  criteria: KpiCriteriaDTO[];
};

export async function getCurrentKpi(
  type: KpiType,
): Promise<KpiTemplateDTO | null> {
  const template = await prisma.kpiTemplate.findFirst({
    where: { type, isCurrent: true },
    include: {
      criteria: {
        orderBy: { orderNumber: "asc" },
        include: { subcriteria: { orderBy: { orderNumber: "asc" } } },
      },
    },
  });
  if (!template) return null;

  return {
    id: template.id,
    type: template.type,
    version: template.version,
    createdAt: template.createdAt.toISOString(),
    criteria: template.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      orderNumber: c.orderNumber,
      subcriteria: c.subcriteria.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? "",
        bobotPersen: Number(s.bobotPersen),
        ahpWeight: Number(s.ahpWeight),
        orderNumber: s.orderNumber,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Write: simpan versi baru (CRUD difinalisasi sekaligus)
// ---------------------------------------------------------------------------

export type KpiSaveData = {
  criteria: {
    name: string;
    subcriteria: { name: string; description: string; bobotPersen: number }[];
  }[];
};

export type SaveKpiResult =
  | { success: true; newVersion: number }
  | { success: false; errors: string[] };

export async function saveKpi(
  type: KpiType,
  data: KpiSaveData,
): Promise<SaveKpiResult> {
  const user = await getSessionUser();
  if (!user || !(await isHrd())) {
    return { success: false, errors: ["Anda tidak memiliki akses."] };
  }

  // --- Validasi struktur & bobot ---
  const errors: string[] = [];
  if (data.criteria.length === 0) {
    errors.push("Minimal harus ada satu kriteria.");
  }
  data.criteria.forEach((c, i) => {
    const label = c.name.trim() || `Kriteria ${i + 1}`;
    if (!c.name.trim()) errors.push(`Nama kriteria ke-${i + 1} wajib diisi.`);
    if (c.subcriteria.length === 0) {
      errors.push(`Kriteria "${label}" belum memiliki subkriteria.`);
      return;
    }
    c.subcriteria.forEach((s, j) => {
      if (!s.name.trim())
        errors.push(`Nama subkriteria ke-${j + 1} pada "${label}" wajib diisi.`);
    });
    const subTotal = c.subcriteria.reduce((s, x) => s + x.bobotPersen, 0);
    if (!near100(subTotal)) {
      errors.push(
        `Total bobot subkriteria "${label}" harus 100% (saat ini: ${subTotal.toFixed(2)}%).`,
      );
    }
  });
  if (errors.length > 0) return { success: false, errors };

  // --- Bobot global (kriteria tidak punya bobot → normalisasi global) ---
  const allBobots = data.criteria.flatMap((c) =>
    c.subcriteria.map((s) => s.bobotPersen),
  );
  const globalWeights = calculateGlobalAhpWeights(allBobots);
  const round6 = (n: number) => Number(n.toFixed(6));

  const current = await prisma.kpiTemplate.findFirst({
    where: { type, isCurrent: true },
  });
  const newVersion = (current?.version ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    if (current) {
      await tx.kpiTemplate.update({
        where: { id: current.id },
        data: { isCurrent: false },
      });
    }

    const template = await tx.kpiTemplate.create({
      data: {
        type,
        version: newVersion,
        isCurrent: true,
        createdBy: user.id,
      },
    });

    let globalIndex = 0;
    for (let i = 0; i < data.criteria.length; i++) {
      const c = data.criteria[i];
      // Share kriteria = Σ bobot subnya / total semua bobot (informatif).
      const critShare = c.subcriteria.reduce(
        (acc, s, j) => acc + (globalWeights[globalIndex + j] ?? 0),
        0,
      );
      const newCriteria = await tx.kpiCriteria.create({
        data: {
          kpiTemplateId: template.id,
          name: c.name.trim(),
          bobotPersen: 0, // kriteria tidak punya bobot di v2
          ahpWeight: round6(critShare),
          orderNumber: i + 1,
        },
      });

      for (let j = 0; j < c.subcriteria.length; j++) {
        const s = c.subcriteria[j];
        await tx.kpiSubcriteria.create({
          data: {
            kpiCriteriaId: newCriteria.id,
            name: s.name.trim(),
            description: s.description?.trim() || null,
            bobotPersen: s.bobotPersen,
            ahpWeight: round6(globalWeights[globalIndex] ?? 0),
            orderNumber: j + 1,
          },
        });
        globalIndex += 1;
      }
    }

    return template;
  });

  revalidatePath(`/hrd/kpi/${type}`);
  revalidatePath(`/hrd/kpi/${type}/ahp-result`);
  return { success: true, newVersion: created.version };
}

// ---------------------------------------------------------------------------
// Read: hasil perhitungan AHP (matriks, priority vector, CR, bobot global)
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
  const template = await prisma.kpiTemplate.findFirst({
    where: { type, isCurrent: true },
    include: {
      criteria: {
        orderBy: { orderNumber: "asc" },
        include: { subcriteria: { orderBy: { orderNumber: "asc" } } },
      },
    },
  });
  if (!template) return null;

  const allBobots = template.criteria.flatMap((c) =>
    c.subcriteria.map((s) => Number(s.bobotPersen)),
  );
  const globalWeights = calculateGlobalAhpWeights(allBobots);

  const criteria: AhpCriteriaResult[] = template.criteria.map((c) => {
    const subs = c.subcriteria.map((s) => ({
      id: s.id,
      name: s.name,
      bobotPersen: Number(s.bobotPersen),
    }));
    const ahp = calculateAhpFromBobot(subs);
    return {
      name: c.name,
      subNames: subs.map((s) => s.name),
      matrix: ahp.matrix,
      weights: ahp.weights.map((w, i) => ({
        name: subs[i].name,
        ahpWeight: w.ahpWeight,
      })),
      lambdaMax: ahp.lambdaMax,
      ci: ahp.ci,
      cr: ahp.cr,
    };
  });

  const global: { name: string; globalWeight: number }[] = [];
  let gi = 0;
  for (const c of template.criteria) {
    for (const s of c.subcriteria) {
      global.push({ name: s.name, globalWeight: globalWeights[gi] ?? 0 });
      gi += 1;
    }
  }
  const globalTotal = global.reduce((a, b) => a + b.globalWeight, 0);

  return {
    version: template.version,
    createdAt: template.createdAt.toISOString(),
    criteria,
    global,
    globalTotal,
  };
}
