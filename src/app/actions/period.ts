"use server";

import { revalidatePath } from "next/cache";
import type { Period } from "@prisma/client";

import prisma from "@/lib/prisma";
import { isHrd, getSessionUser } from "@/lib/auth-guard";
import {
  buildPeriodName,
  computeDeadline,
  parseDateInput,
  simplePeriodName,
  toDateInput,
} from "@/lib/period";
import type { ActionResult } from "@/app/actions/branch";

export type { ActionResult };

export type PeriodInput = {
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
};

// ---------------------------------------------------------------------------
// Helper internal (non-exported, boleh sync)
// ---------------------------------------------------------------------------

/** Hitung urutan periode dalam tahun tertentu (jumlah existing + 1). */
async function nextOrderInYear(year: number, excludeId?: number): Promise<number> {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const count = await prisma.period.count({
    where: {
      startDate: { gte: start, lt: end },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return count + 1;
}

/** Snapshot KPI isCurrent=true ke periode lalu set ACTIVE. */
async function activateWithSnapshot(
  periodId: number,
): Promise<ActionResult> {
  const [kpiAtas, kpiBawah] = await Promise.all([
    prisma.kpiTemplate.findFirst({ where: { type: "atas", isCurrent: true } }),
    prisma.kpiTemplate.findFirst({ where: { type: "bawah", isCurrent: true } }),
  ]);
  if (!kpiAtas || !kpiBawah) {
    return {
      success: false,
      error: "KPI Atas/Bawah aktif belum tersedia. Lengkapi KPI terlebih dahulu.",
    };
  }
  await prisma.period.update({
    where: { id: periodId },
    data: { status: "ACTIVE", kpiAtasId: kpiAtas.id, kpiBawahId: kpiBawah.id },
  });
  return { success: true };
}

/**
 * Tutup periode lalu, jika bagian dari siklus, aktifkan periode berikutnya.
 * Jika tidak ada periode berikutnya dalam siklus → tandai siklus selesai.
 */
async function closeAndAdvance(period: Period): Promise<ActionResult> {
  await prisma.period.update({
    where: { id: period.id },
    data: { status: "CLOSED" },
  });

  if (period.isAutoCycle && period.cycleGroup) {
    const next = await prisma.period.findFirst({
      where: {
        cycleGroup: period.cycleGroup,
        status: "DRAFT",
        cycleOrder: { gt: period.cycleOrder ?? 0 },
      },
      orderBy: { cycleOrder: "asc" },
    });

    if (next) {
      const result = await activateWithSnapshot(next.id);
      if (!result.success) return result;
    } else {
      await prisma.cycleSetting.updateMany({
        where: { cycleGroup: period.cycleGroup },
        data: { isComplete: true },
      });
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getPeriods(): Promise<Period[]> {
  return prisma.period.findMany({
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getActivePeriod(): Promise<Period | null> {
  return prisma.period.findFirst({ where: { status: "ACTIVE" } });
}

export async function getPeriod(id: number): Promise<Period | null> {
  return prisma.period.findUnique({ where: { id } });
}

export type CycleRow = {
  id: number;
  cycleOrder: number;
  name: string;
  startDate: string;
  endDate: string;
  deadline: string;
  status: Period["status"];
  isAutoCycle: boolean;
};

/**
 * Ambil "batch" siklus terbaru (3 periode terakhir berdasarkan cycleGroup).
 * Periode manual lama tanpa cycleGroup diabaikan.
 */
export async function getCurrentCycle(): Promise<{
  rows: CycleRow[];
  allClosed: boolean;
}> {
  const latest = await prisma.period.findFirst({
    where: { cycleGroup: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!latest?.cycleGroup) return { rows: [], allClosed: false };

  const periods = await prisma.period.findMany({
    where: { cycleGroup: latest.cycleGroup },
    orderBy: { cycleOrder: "asc" },
  });

  const rows: CycleRow[] = periods.map((p) => ({
    id: p.id,
    cycleOrder: p.cycleOrder ?? 0,
    name: p.name,
    startDate: toDateInput(p.startDate),
    endDate: toDateInput(p.endDate),
    deadline: toDateInput(p.deadlinePenilaian),
    status: p.status,
    isAutoCycle: p.isAutoCycle,
  }));

  const allClosed =
    rows.length > 0 && periods.every((p) => p.status === "CLOSED");
  return { rows, allClosed };
}

// ---------------------------------------------------------------------------
// Manual create / update
// ---------------------------------------------------------------------------

type DateValidation =
  | { error: string; fieldErrors?: Record<string, string> }
  | { start: Date; end: Date };

function validateDates(data: PeriodInput): DateValidation {
  const start = parseDateInput(data.startDate);
  const end = parseDateInput(data.endDate);
  if (!start) {
    return {
      error: "Tanggal mulai tidak valid.",
      fieldErrors: { startDate: "Tanggal mulai wajib diisi." },
    };
  }
  if (!end) {
    return {
      error: "Tanggal selesai tidak valid.",
      fieldErrors: { endDate: "Tanggal selesai wajib diisi." },
    };
  }
  if (end < start) {
    return {
      error: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      fieldErrors: { endDate: "Harus setelah tanggal mulai." },
    };
  }
  return { start, end };
}

export async function createPeriod(data: PeriodInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const validated = validateDates(data);
  if ("error" in validated) {
    return { success: false, error: validated.error, fieldErrors: validated.fieldErrors };
  }

  const active = await prisma.period.findFirst({ where: { status: "ACTIVE" } });
  if (active) {
    return {
      success: false,
      error: `Masih ada periode aktif ("${active.name}").`,
    };
  }

  const order = await nextOrderInYear(validated.start.getUTCFullYear());

  await prisma.period.create({
    data: {
      name: buildPeriodName(validated.start, order),
      startDate: validated.start,
      endDate: validated.end,
      deadlinePenilaian: computeDeadline(validated.start),
      status: "DRAFT",
      createdBy: user.id,
      isAutoCycle: false,
    },
  });

  revalidatePath("/hrd/periode");
  return { success: true };
}

export async function updatePeriod(
  id: number,
  data: PeriodInput,
): Promise<ActionResult> {
  if (!(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const period = await prisma.period.findUnique({ where: { id } });
  if (!period) return { success: false, error: "Periode tidak ditemukan." };
  if (period.status !== "DRAFT") {
    return {
      success: false,
      error: "Hanya periode berstatus DRAFT yang dapat diubah.",
    };
  }

  const validated = validateDates(data);
  if ("error" in validated) {
    return { success: false, error: validated.error, fieldErrors: validated.fieldErrors };
  }

  // Regenerate nama: pakai cycleOrder bila ada, jika tidak hitung dari tahun.
  const order =
    period.cycleOrder ??
    (await nextOrderInYear(validated.start.getUTCFullYear(), id));

  await prisma.period.update({
    where: { id },
    data: {
      name: buildPeriodName(validated.start, order),
      startDate: validated.start,
      endDate: validated.end,
      deadlinePenilaian: computeDeadline(validated.start),
    },
  });

  revalidatePath("/hrd/periode");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Activate / close / delete
// ---------------------------------------------------------------------------

export async function activatePeriod(id: number): Promise<ActionResult> {
  if (!(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const period = await prisma.period.findUnique({ where: { id } });
  if (!period) return { success: false, error: "Periode tidak ditemukan." };
  if (period.status !== "DRAFT") {
    return { success: false, error: "Hanya periode DRAFT yang dapat diaktifkan." };
  }

  const active = await prisma.period.findFirst({ where: { status: "ACTIVE" } });
  if (active) {
    return { success: false, error: `Sudah ada periode aktif ("${active.name}").` };
  }

  const result = await activateWithSnapshot(id);
  revalidatePath("/hrd/periode");
  return result;
}

export async function closePeriod(id: number): Promise<ActionResult> {
  if (!(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const period = await prisma.period.findUnique({ where: { id } });
  if (!period) return { success: false, error: "Periode tidak ditemukan." };
  if (period.status !== "ACTIVE") {
    return { success: false, error: "Hanya periode ACTIVE yang dapat ditutup." };
  }

  // Manual → hanya close. Auto-cycle → close + aktifkan berikutnya.
  const result = await closeAndAdvance(period);
  revalidatePath("/hrd/periode");
  return result;
}

/** Tutup paksa (override manual saat mode auto-cycle): close + aktifkan berikutnya. */
export async function forceClosePeriod(id: number): Promise<ActionResult> {
  if (!(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const period = await prisma.period.findUnique({ where: { id } });
  if (!period) return { success: false, error: "Periode tidak ditemukan." };
  if (period.status !== "ACTIVE") {
    return { success: false, error: "Hanya periode ACTIVE yang dapat ditutup." };
  }

  const result = await closeAndAdvance(period);
  revalidatePath("/hrd/periode");
  return result;
}

export async function deletePeriod(id: number): Promise<ActionResult> {
  if (!(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const period = await prisma.period.findUnique({ where: { id } });
  if (!period) return { success: false, error: "Periode tidak ditemukan." };
  if (period.status !== "DRAFT") {
    return { success: false, error: "Hanya periode DRAFT yang dapat dihapus." };
  }

  await prisma.period.delete({ where: { id } });
  revalidatePath("/hrd/periode");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Inline row save + auto-cycle
// ---------------------------------------------------------------------------

export type SavePeriodRowInput = {
  order: number; // 1 | 2 | 3
  startDate: string;
  endDate: string;
};

/** Tentukan cycleGroup batch berjalan; buat baru jika tak ada / sudah selesai. */
async function resolveCurrentCycleGroup(): Promise<string> {
  const latest = await prisma.period.findFirst({
    where: { cycleGroup: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (latest?.cycleGroup) {
    const batch = await prisma.period.findMany({
      where: { cycleGroup: latest.cycleGroup },
    });
    const allClosed = batch.every((p) => p.status === "CLOSED");
    if (!allClosed) return latest.cycleGroup;
  }
  return `BATCH-${Date.now().toString(36)}`;
}

/**
 * Simpan satu baris periode (inline). Nama otomatis "Periode I/II/III"
 * mengikuti `order`. Status menjadi DRAFT, deadline = mulai + 7 hari.
 */
export async function savePeriodRow(
  input: SavePeriodRowInput,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const order = input.order;
  if (![1, 2, 3].includes(order)) {
    return { success: false, error: "Urutan periode tidak valid." };
  }

  const validated = validateDates({
    startDate: input.startDate,
    endDate: input.endDate,
  });
  if ("error" in validated) {
    return {
      success: false,
      error: validated.error,
      fieldErrors: validated.fieldErrors,
    };
  }

  const cycleGroup = await resolveCurrentCycleGroup();

  // Validasi urutan terhadap baris sebelumnya/berikutnya yang sudah tersimpan.
  if (order > 1) {
    const prev = await prisma.period.findFirst({
      where: { cycleGroup, cycleOrder: order - 1 },
    });
    if (prev && validated.start <= prev.endDate) {
      return {
        success: false,
        error: `Tanggal mulai harus setelah selesainya Periode ${order - 1}.`,
        fieldErrors: { startDate: "Harus setelah periode sebelumnya." },
      };
    }
  }
  if (order < 3) {
    const next = await prisma.period.findFirst({
      where: { cycleGroup, cycleOrder: order + 1 },
    });
    if (next && validated.end >= next.startDate) {
      return {
        success: false,
        error: `Tanggal selesai harus sebelum mulai Periode ${order + 1}.`,
        fieldErrors: { endDate: "Bentrok dengan periode berikutnya." },
      };
    }
  }

  const existing = await prisma.period.findFirst({
    where: { cycleGroup, cycleOrder: order },
  });

  if (existing) {
    if (existing.status !== "DRAFT") {
      return {
        success: false,
        error: "Periode sudah aktif/selesai dan tidak dapat diubah.",
      };
    }
    await prisma.period.update({
      where: { id: existing.id },
      data: {
        name: simplePeriodName(order, validated.start.getUTCFullYear()),
        startDate: validated.start,
        endDate: validated.end,
        deadlinePenilaian: computeDeadline(validated.start),
      },
    });
  } else {
    await prisma.period.create({
      data: {
        name: simplePeriodName(order, validated.start.getUTCFullYear()),
        startDate: validated.start,
        endDate: validated.end,
        deadlinePenilaian: computeDeadline(validated.start),
        status: "DRAFT",
        createdBy: user.id,
        cycleGroup,
        cycleOrder: order,
        isAutoCycle: false,
      },
    });
  }

  revalidatePath("/hrd/periode");
  return { success: true };
}

/**
 * Mulai siklus otomatis: tandai 3 periode batch berjalan sebagai auto-cycle,
 * lalu aktifkan Periode I. Periode II & III tetap DRAFT.
 */
export async function startAutoCycle(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !(await isHrd())) {
    return { success: false, error: "Anda tidak memiliki akses." };
  }

  const latest = await prisma.period.findFirst({
    where: { cycleGroup: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!latest?.cycleGroup) {
    return { success: false, error: "Belum ada periode untuk dimulai." };
  }

  const batch = await prisma.period.findMany({
    where: { cycleGroup: latest.cycleGroup },
    orderBy: { cycleOrder: "asc" },
  });
  if (batch.length !== 3 || !batch.every((p) => p.status === "DRAFT")) {
    return {
      success: false,
      error: "Simpan tanggal semua periode terlebih dahulu.",
    };
  }

  const active = await prisma.period.findFirst({ where: { status: "ACTIVE" } });
  if (active) {
    return { success: false, error: `Masih ada periode aktif ("${active.name}").` };
  }

  await prisma.period.updateMany({
    where: { cycleGroup: latest.cycleGroup },
    data: { isAutoCycle: true },
  });
  await prisma.cycleSetting.upsert({
    where: { cycleGroup: latest.cycleGroup },
    create: {
      cycleGroup: latest.cycleGroup,
      isComplete: false,
      createdBy: user.id,
    },
    update: { isComplete: false },
  });

  const first = batch.find((p) => p.cycleOrder === 1) ?? batch[0];
  const result = await activateWithSnapshot(first.id);

  revalidatePath("/hrd/periode");
  return result;
}

/**
 * Auto-transition: tutup periode ACTIVE yang sudah lewat end_date,
 * lalu aktifkan periode DRAFT berikutnya dalam siklus (jika ada).
 * Tidak memakai revalidatePath agar aman dipanggil saat render.
 */
export async function checkAndTransition(): Promise<void> {
  const active = await prisma.period.findFirst({ where: { status: "ACTIVE" } });
  if (!active) return;

  // end_date disimpan sebagai UTC midnight; bandingkan dengan akhir hari tsb.
  const endOfDay = new Date(active.endDate);
  endOfDay.setUTCHours(23, 59, 59, 999);
  if (Date.now() <= endOfDay.getTime()) return;

  await closeAndAdvance(active);
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export type ProgressRow = { label: string; done: number; total: number };

export async function getPeriodProgress(
  periodId: number,
): Promise<ProgressRow[]> {
  const [kcTotal, kdPusatTotal, kdCabangTotal, karyawanTotal] =
    await Promise.all([
      prisma.user.count({ where: { role: "kepala_cabang", isActive: true } }),
      prisma.user.count({
        where: {
          role: "kepala_divisi",
          isActive: true,
          branch: { isPusat: true },
        },
      }),
      prisma.user.count({
        where: {
          role: "kepala_divisi",
          isActive: true,
          branch: { isPusat: false },
        },
      }),
      prisma.user.count({ where: { role: "karyawan", isActive: true } }),
    ]);

  const completed = await prisma.assessmentFinalScore.findMany({
    where: { periodId, isComplete: true },
    include: { assessee: { include: { branch: true } } },
  });

  let kcDone = 0;
  let kdPusatDone = 0;
  let kdCabangDone = 0;
  let karyawanDone = 0;
  for (const fs of completed) {
    const u = fs.assessee;
    if (u.role === "kepala_cabang") kcDone += 1;
    else if (u.role === "kepala_divisi") {
      if (u.branch?.isPusat) kdPusatDone += 1;
      else kdCabangDone += 1;
    } else if (u.role === "karyawan") karyawanDone += 1;
  }

  return [
    { label: "Kepala Cabang", done: kcDone, total: kcTotal },
    { label: "Kepala Divisi Pusat", done: kdPusatDone, total: kdPusatTotal },
    { label: "Kepala Divisi Cabang", done: kdCabangDone, total: kdCabangTotal },
    { label: "Karyawan", done: karyawanDone, total: karyawanTotal },
  ];
}
